# main.py
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.generate_output import generate_csv

if __name__ == "__main__":
    use_sample = "--sample" in sys.argv
    if use_sample:
        print("Running on sample (50 candidates)...")
    else:
        print("Running on full 100K candidate pool...")
    generate_csv(use_sample=use_sample)