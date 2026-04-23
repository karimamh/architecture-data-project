
# Transformer ton score en 0 → 100
def min_max_scaling(series):
    return (series - series.min()) / (series.max() - series.min()) * 100