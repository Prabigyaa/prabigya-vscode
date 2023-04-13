"""
Determining variable convention using Regular Expressions.
"""

import re
from enum import Enum


class VariableConventions(Enum):
    """
    Enums representing variable naming conventions.

    There might be combination of these
    """

    Undefined = 0
    Snakecase = 1
    Pascalcase = 2
    Camelcase = 3

    Hugariannotation = 4
    Abbrevationbased = 5

    Screamingsnakecase = 6


def get_convention(variable: str) -> list[VariableConventions]:
    """
    Returns a list of matching variable conventions.

    If only one matches, first item will be the matched convention.
    """

    containing_capital_letters = r"[A-Z]+"
    containing_capital_letters_only = r"^[A-Z]+$"
    starting_with_capital_letters = r"^[A-Z]"
    containing_small_letters = r"[a-z]+"
    starting_with_small_letters = r"^[a-z]"
    containing_under_scores = r"_+"
    starting_with_under_scores = r"^_"

    contains_capital_letters = (
        re.search(containing_capital_letters, variable) is not None
    )

    contains_capital_letters_only = (
        re.search(containing_capital_letters_only, variable) is not None
    )

    starts_with_capital_letters = (
        re.search(starting_with_capital_letters, variable) is not None
    )

    contains_small_letters = re.search(containing_small_letters, variable) is not None
    starts_with_small_letters = re.search(starting_with_small_letters, variable)

    starts_with_under_scores = (
        re.search(starting_with_under_scores, variable) is not None
    )

    # for different conventions like local variables, private variables or others
    while starts_with_under_scores:
        starts_with_under_scores = (
            re.search(starting_with_under_scores, variable[1:]) is not None
        )
    # At this point, the remaining underscores (if any) shouldn't in the front
    contains_under_scores = re.search(containing_under_scores, variable) is not None

    matched_conventions: list[VariableConventions] = []

    if contains_under_scores:

        if not contains_small_letters:
            matched_conventions.append(VariableConventions.Screamingsnakecase)
        else:
            matched_conventions.append(VariableConventions.Snakecase)

    if starts_with_capital_letters:

        # if capital letters are present in other places and it's not screaming snake case
        if re.search(containing_capital_letters, variable[1:]) is not None and contains_small_letters:
            matched_conventions.append(VariableConventions.Pascalcase)

    if starts_with_small_letters:

        if contains_capital_letters:
            matched_conventions.append(VariableConventions.Camelcase)

    if len(matched_conventions) == 0:
        # some other cases

        # if there are only capital letters (in case of constants)
        if contains_capital_letters_only:
            matched_conventions.append(VariableConventions.Screamingsnakecase)
        else:  # if the list is empty then the convention isn't known
            matched_conventions.append(VariableConventions.Undefined)

    return matched_conventions


if __name__ == "__main__":
    """
    Few Tests
    """

    camel_case_variables = ["startServer", "loopEnd", "createConnection"]
    pascal_case_variables = ["StartServer", "LoopEnd", "CreateConnection"]
    snake_case_variables = ["start_server", "loop_end", "create_connection"]
    screaming_snake_case_variables = ["START_SERVER", "LOOP_END", "CREATE_CONNECTION"]
    mixed_case_variables = ["start_Server", "Loop_End", "STartThis", "CRATECONNECTION"]

    print("\n______camelCase______")
    for var in camel_case_variables:
        output_convention = get_convention(var)
        print(f"Name: {var}, Convention: {output_convention}")

    print("\n______PascalCase______")
    for var in pascal_case_variables:
        output_convention = get_convention(var)
        print(f"Name: {var}, Convention: {output_convention}")

    print("\n______snake_case______")
    for var in snake_case_variables:
        output_convention = get_convention(var)
        print(f"Name: {var}, Convention: {output_convention}")

    print("\n______SCREAMING_SNAKE_CASE______")
    for var in screaming_snake_case_variables:
        output_convention = get_convention(var)
        print(f"Name: {var}, Convention: {output_convention}")

    print("\n______mixed_case______")
    for var in mixed_case_variables:
        output_convention = get_convention(var)
        print(f"Name: {var}, Convention: {output_convention}")
