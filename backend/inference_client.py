import logging
import os
import shutil
import time
from typing import Tuple

import replicate

logger = logging.getLogger("inference_client")


class IDMInferenceClient:
    """Replicate client for IDM-VTON inference via cuuupid/idm-vton."""

    def __init__(self, api_token: str = ""):
        self.api_token = api_token.strip()

    def is_configured(self) -> bool:
        return bool(self.api_token)

    def health(self) -> dict:
        if not self.is_configured():
            raise ValueError("REPLICATE_API_TOKEN is not configured in backend/.env")
        return {
            "status": "ok",
            "service": "replicate",
            "model": "cuuupid/idm-vton",
        }

    @staticmethod
    def _save_output(source, final_path: str) -> bool:
        """Download or copy a Replicate output to final_path. Returns True on success."""
        if not source:
            return False

        # Replicate output objects expose a .url attribute or are URL strings
        source_url = getattr(source, "url", None)
        if callable(source_url):
            source_url = source_url()

        if source_url:
            import httpx
            response = httpx.get(str(source_url), timeout=120)
            response.raise_for_status()
            with open(final_path, "wb") as f:
                f.write(response.content)
            return True

        if isinstance(source, str):
            if source.startswith(("http://", "https://")):
                import httpx
                response = httpx.get(source, timeout=120)
                response.raise_for_status()
                with open(final_path, "wb") as f:
                    f.write(response.content)
                return True
            if os.path.isfile(source):
                shutil.copyfile(source, final_path)
                return True

        return False

    def predict_tryon(
        self,
        person_file_path: str,
        garment_file_path: str,
        garment_description: str,
        category: str = "upper_body",
        auto_mask: bool = True,
        auto_crop: bool = False,
        denoise_steps: int = 30,
        seed: int = 42,
        output_dir: str = "",
        job_id: str = "req_0000",
    ) -> Tuple[str, str, float]:
        """
        Run IDM-VTON inference on Replicate and return
        (result_path, masked_path, elapsed_seconds).
        Raises RuntimeError on any failure — never silently falls back.
        """
        if not self.is_configured():
            raise ValueError("REPLICATE_API_TOKEN is not configured in backend/.env")

        if not os.path.isfile(person_file_path):
            raise FileNotFoundError(f"Person image not found: {person_file_path}")

        if not os.path.isfile(garment_file_path):
            raise FileNotFoundError(f"Garment image not found: {garment_file_path}")

        if category not in {"upper_body", "lower_body", "dresses"}:
            raise ValueError(f"Unsupported category: {category}")

        if not 20 <= int(denoise_steps) <= 40:
            raise ValueError("denoise_steps must be between 20 and 40")

        os.makedirs(output_dir, exist_ok=True)

        result_path = os.path.join(output_dir, f"{job_id}_result.png")
        masked_path = os.path.join(output_dir, f"{job_id}_masked.png")

        started = time.time()
        logger.info("Starting Replicate IDM-VTON inference (job=%s)", job_id)

        try:
            # Use explicit api_token so the token is NEVER read from os.environ
            rep_client = replicate.Client(api_token=self.api_token)

            with open(person_file_path, "rb") as person_file, \
                 open(garment_file_path, "rb") as garment_file:

                prediction = rep_client.run(
                    "cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985",
                    input={
                        "human_img":    person_file,
                        "garm_img":     garment_file,
                        "garment_des":  garment_description or "",
                        "category":     category,
                        "steps":        int(denoise_steps),
                        "seed":         int(seed),
                        "crop":         bool(auto_crop),
                    },
                )

            logger.info("Replicate prediction completed (job=%s)", job_id)

            # cuuupid/idm-vton returns a list: [result_image, masked_image]
            if isinstance(prediction, (tuple, list)):
                if len(prediction) >= 2:
                    result_source = prediction[0]
                    masked_source = prediction[1]
                elif len(prediction) == 1:
                    result_source = prediction[0]
                    masked_source = prediction[0]
                else:
                    raise RuntimeError("Replicate returned an empty prediction list")
            else:
                result_source = prediction
                masked_source = prediction

            if not self._save_output(result_source, result_path):
                raise RuntimeError("Replicate returned no downloadable result image")

            if not self._save_output(masked_source, masked_path):
                # If the model only returned one image, duplicate it as the masked view
                shutil.copyfile(result_path, masked_path)

            elapsed = round(time.time() - started, 2)
            logger.info("IDM-VTON done in %ss (job=%s)", elapsed, job_id)

            return result_path, masked_path, elapsed

        except Exception as exc:
            logger.exception("Replicate IDM-VTON inference failed (job=%s)", job_id)
            raise RuntimeError(f"Replicate IDM-VTON inference failed: {exc}") from exc