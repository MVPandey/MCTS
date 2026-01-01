"""
Lightweight LLM client with OpenAI-compatible API support.

Usage:
    from backend.llm import LLM, Message, Tool

    llm = LLM(api_key="sk-...", base_url="https://openrouter.ai/api/v1", model="gpt-4o")

    # Simple completion
    response = await llm.complete("Hello!")
    print(response.content)

    # With tools - automatic execution
    @Tool
    def get_weather(city: str) -> str:
        '''Get current weather for a city.'''
        return f"Sunny, 22C in {city}"

    response = await llm.run("What's the weather in London?", tools=[get_weather])
    print(response.content)  # "The weather in London is sunny, 22C"

    # Tool registry for multiple tools
    tools = ToolRegistry()

    @tools.register
    def search(query: str) -> str:
        return f"Results for {query}"

    @tools.register
    def calculate(expression: str) -> str:
        return str(eval(expression))

    response = await llm.run("Search for Python tutorials", tools=tools)
"""

from .client import LLM
from .errors import (
    AuthenticationError,
    ContentFilterError,
    ContextLengthError,
    InvalidRequestError,
    LLMError,
    ModelNotFoundError,
    RateLimitError,
)
from .tools import Tool, ToolRegistry
from .types import Completion, Function, Message, Role, ToolCall, Usage

__all__ = [
    # Client
    "LLM",
    # Tools
    "Tool",
    "ToolRegistry",
    # Types
    "Message",
    "Completion",
    "ToolCall",
    "Function",
    "Usage",
    "Role",
    # Errors
    "LLMError",
    "AuthenticationError",
    "RateLimitError",
    "InvalidRequestError",
    "ModelNotFoundError",
    "ContentFilterError",
    "ContextLengthError",
]
