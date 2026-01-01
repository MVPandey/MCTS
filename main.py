import asyncio

from backend.llm import LLM
from backend.utils.config import config

llm = LLM(
    api_key=config.llm_api_key.get_secret_value(),
    base_url=config.llm_base_url,
    model=config.llm_name,
)


async def main():
    response = await llm.complete("Hello, how are you?")
    print(response.message.content)


if __name__ == "__main__":
    asyncio.run(main())
