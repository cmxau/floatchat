import time


def measure_latency(func, *args, **kwargs):
    """
    Measure execution latency of a function.

    Returns:
        result: function output (or None if error)
        latency: execution time in seconds
        error: error message (if any)
    """
    start = time.perf_counter()

    try:
        result = func(*args, **kwargs)
        error = None
    except Exception as e:
        result = None
        error = str(e)

    end = time.perf_counter()

    latency = end - start

    return result, latency, error