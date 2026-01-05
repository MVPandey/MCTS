"""
DTS Example Runner

Demonstrates the Dialogue Tree Search engine with a sample configuration.
"""

# -----------------------------------------------------------------------------
# Imports
# -----------------------------------------------------------------------------
import asyncio
import logging
import time

from backend.core.dts import DTSConfig, DTSEngine
from backend.llm.client import LLM
from backend.utils.config import config

# -----------------------------------------------------------------------------
# Logging Configuration
# -----------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
# LLM Client
# -----------------------------------------------------------------------------
llm = LLM(
    api_key=config.openai_api_key,
    base_url=config.openai_base_url,
    model=config.llm_name,
)


# -----------------------------------------------------------------------------
# Main Entry Point
# -----------------------------------------------------------------------------
async def run_dts_example() -> None:
    """Run a sample DTS optimization."""
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
    asyncio.run(run_dts_example())
    elapsed = time.time() - start_time
    logger.info(f"Time taken: {elapsed:.2f} seconds")
