import asyncio
import time

from backend.core.dts import DTSConfig, DTSEngine
from backend.llm.client import LLM
from backend.utils.config import config

llm = LLM(
    api_key=config.openai_api_key,
    base_url=config.openai_base_url,
    model="z-ai/glm-4.7",
)


async def test_dts():
    engine = DTSEngine(
        llm=llm,
        config=DTSConfig(
            goal="Identify the most promising direction for a research paper",
            first_message="I want to improve the Muon optimizer to increase training speed/performance, etc, specifically for the world record nano-gpt run",
            deep_research=True,
            turns_per_branch=2,
            user_intents_per_branch=2,
        ),
    )

    result = await engine.run(rounds=2)
    result.save_json("dts_output.json")


if __name__ == "__main__":
    start_time = time.time()
    asyncio.run(test_dts())
    end_time = time.time()
    print(f"Time taken: {end_time - start_time:.2f} seconds")
