// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Import the language client, language client options and server options from VSCode language client.
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';
import { once } from 'events';
import { spawn } from 'child_process';

let client: LanguageClient;

/** 
 * path to server directory
 */
const serverDirPath = path.join(__dirname, '..', 'server');
/**
 * path to folder containing helper python scripts
 */
const serverUtilsDirPath = path.join(serverDirPath, "src", "utils"); 

// some variables based on OS (mostly windows is the exception)
/**
 * python executable is inside of venv/Scripts in windows system.
 * 
 * And in venv/bin in linux systems
 */
let executablePath = "bin";
/**
 * python3 will most probably cause error in windows ( and in linux python may result in invoking python2 instead of python3)
 * 
 * After finding the python corresponding to virtual environment, the name should be changed
*/
let pythonName = "python3";
if (process.platform === "win32") {
	executablePath = "Scripts";
	pythonName = "python";
}

/**
 * Executable corresponding to virtual environment
 * 
 * Change required if new / different virtual environment is used
 * */
let pythonExecutablePath: string = path.join(serverDirPath, executablePath, pythonName);
/**
 * True if python is found
 */
let foundPython: boolean = false;
/**
 * True if venv creation was successful or venv was already present
 */
let venvSuccess: boolean = false;
/**
 * True if predefined virtual environment path exists
 */
let venvPresent: boolean = fs.existsSync(pythonExecutablePath);

/**
 * Changing for ease of use
 */
if (venvPresent) {
	pythonName = pythonExecutablePath;
}

/**
 * To check if python is present in the system
 * @returns true if python 3 installation is found, false otherwise
 */
async function checkPythonAndNotify(): Promise<boolean> {
	let checkPythonScript = path.join(serverUtilsDirPath, "check_system_python.py");

	let checkPython = spawn(pythonName, [checkPythonScript]);
	let minorPythonRevion = "0"; // making it string for ease of use

	// getting the minor python revision
	checkPython.stdout.on('data', (data: string) => {
		minorPythonRevion = data;
		console.log(`Found python 3.${data}`);
	});

	// getting the exit code
	checkPython.on('close', (exitCode: number) => {
		foundPython = !exitCode;

		if (foundPython) {
			vscode.window.showInformationMessage("Found python 3.", minorPythonRevion);
		} else {
			vscode.window.showErrorMessage("Python installation not found");
		}
	});

	await once(checkPython, "close");

	return foundPython;
}

/**
 * To create virtual environment if not present already
 * @returns true if virtual environment is successfully created or is already present, false otherwise
 */
async function createVirtualEnvironmentAndNotify(): Promise<boolean> {

	/**
	 * If virtual environment is already present, then there is no point in checking through python.
	 * 
	 * The error in the python should be handled by foundPython variable
	 * 
	 * i.e. if the python corresponding to the path isn't a proper python installation.
	 */
	if (foundPython && venvPresent) {
		vscode.window.showInformationMessage("Virtual Environment already present");
		return true;
	} 

	const [venvCreatedExitCode, venvAlreadyPresentExitCode] = [0, 1];

	let createVenvScript = path.join(serverUtilsDirPath, "create_venv.py");

	let createVenv = spawn(pythonName, [createVenvScript]);

	// getting the python executable path
	createVenv.stdout.on('data', (data: string) => {
		let pythonPath = JSON.parse(data).PYTHON_EXECUTABLE;
		console.log(`PYTHON_EXECUTABLE_PATH: ${pythonPath}`);
		pythonExecutablePath = pythonPath;

		/**
		 * Changing again as new path is set
		 */
		venvPresent = fs.existsSync(pythonExecutablePath);
	});

	// getting the error message
	createVenv.stderr.on('error', (error: string) => {
		console.error(error);
		vscode.window.showErrorMessage(error);
	});

	// getting the exit code
	createVenv.on('close', (exitCode: number) => {
		venvSuccess = !exitCode;
		if (exitCode === venvCreatedExitCode) {
			vscode.window.showInformationMessage("Successfully created Virtual Environment");
		} else if (exitCode === venvAlreadyPresentExitCode) {
			vscode.window.showInformationMessage("Virtual Environment already present");
		} else {
			vscode.window.showErrorMessage("Virtual Environment creation failed");
		}
	});

	await once(createVenv, "close");

	return venvSuccess;
}

/**
 * To check python dependencies and notify
 * @returns true if all the dependencies are already installed false if some/all requires installation
 */
async function checkDependenciesAndNotify() {
	let checkDependenciesScript = path.join(serverUtilsDirPath, "check_dependencies.py");

	let checkDependencies = spawn(pythonExecutablePath, [checkDependenciesScript]);
	let dependenciesMet = false;

	// getting the python executable path
	checkDependencies.stdout.on('data', (data: string) => {

		console.log(`Received from child process: ${data}`);

		let deserializedOutput = JSON.parse(data);

		let unavailableDependencies: [] = deserializedOutput.not_found;

		if (unavailableDependencies.length) {
			console.log(`These dependencies aren't installed: ${unavailableDependencies.map((value) => value)}`);
		} else {
			console.log("All the dependencies are already installed.");
			vscode.window.showInformationMessage("All the dependencies are available.");
			dependenciesMet = true;
		}
	});

	await once(checkDependencies, "close");

	return dependenciesMet;
}

async function installDependenciesAndNotify() {
	const validExitCodes = [0, 2];
	let installSuccess = false;

	let installDependenciesScript = path.join(serverUtilsDirPath, "install_dependencies.py");

	let installDependencies = spawn(pythonExecutablePath, [installDependenciesScript]);

	// getting the failed installations
	installDependencies.stderr.on('error', (error: string) => {
		console.error("Failed to install ", error);
		vscode.window.showErrorMessage("Failed to install ", error);
	});

	// getting the exit code
	installDependencies.on('close', (exitCode: number) => {
		if (validExitCodes.includes(exitCode)) {
			console.log("Dependencies successfully installed");
			vscode.window.showInformationMessage("Dependencies successfully installed");
			installSuccess = true;
		} else {
			vscode.window.showErrorMessage("Dependencies installation failed");
		}
	});

	await once(installDependencies, "close");

	return installSuccess;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	await checkPythonAndNotify();

	// if python3 is available continue
	if (foundPython) {
		await createVirtualEnvironmentAndNotify();
		await checkDependenciesAndNotify();
		await installDependenciesAndNotify();

		// path to the server.py
		let serverScriptPath = path.join(serverDirPath, 'src', 'nlpserver', 'server.py');
		const args: string[] = [serverScriptPath];

		console.log('Executing ', serverScriptPath);

		// Set the server options 
		// python executable path
		// arguments
		let serverOptions: ServerOptions = {
			command: pythonExecutablePath,
			args: [...args],
			options: {}
		};

		//Create output channel
		let nlpClientOutputChannel = vscode.window.createOutputChannel("nlp client");

		//Write to output.
		nlpClientOutputChannel.appendLine("Logging started");
		nlpClientOutputChannel.show();

		// Options to control the language client
		let clientOptions: LanguageClientOptions = {
			// Register the server for python documents
			documentSelector: [{ scheme: 'file', language: 'python' }],
			outputChannel: nlpClientOutputChannel
		};

		client = new LanguageClient(
			'nlp-bridge',
			'nlp_bridge',
			serverOptions,
			clientOptions
		);

		await client.start();

	}
	context.subscriptions.push(vscode.commands.registerCommand('nlp-bridge.helloWorld', () => {
		vscode.window.showInformationMessage("Hello World");
	})
	);

}


export function deactivate(): Thenable<void> | undefined {
	console.log('Extension was deactivated');
	if (!client) {
		return undefined;
	}

	return client.stop();
}