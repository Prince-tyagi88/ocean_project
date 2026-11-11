import xarray as xr
import numpy as np
from pathlib import Path

project_folder = Path(__file__).resolve().parent.parent
data_file = project_folder / "data" / "indian_ocean_temperature.nc"

ds = xr.open_dataset(data_file, engine="netcdf4")


def get_temperature_grid(
    date: str,
    depth: float,
    stride: int = 10
):

    data = ds["thetao"].sel(
        time=date,
        depth=depth,
        method="nearest"
    )

    # Get coordinates
    latitudes = data.latitude.values
    longitudes = data.longitude.values

    # Get the actual temperature array
    values = data.values

    points = []

    # Downsample the dataset so we don't send
    # hundreds of thousands of points to the browser.

    for i in range(0, len(latitudes), stride):

        for j in range(0, len(longitudes), stride):

            temperature = values[i, j]

            if np.isfinite(temperature):

                points.append({
                    "latitude": float(latitudes[i]),
                    "longitude": float(longitudes[j]),
                    "temperature": float(temperature)
                })

    return {
        "parameter": "water_temperature",
        "time": str(data.time.values),
        "depth": float(data.depth.values),
        "data": points
    }
salinity_file = project_folder / "data" / "indian_ocean_salinity.nc"

salinity_ds = xr.open_dataset(
    salinity_file,
    engine="netcdf4"
)


def get_salinity_grid(
    date: str,
    depth: float,
    stride: int = 10
):
    data = salinity_ds["so"].sel(
        time=date,
        depth=depth,
        method="nearest"
    )

    latitudes = data.latitude.values
    longitudes = data.longitude.values
    values = data.values

    points = []

    for i in range(0, len(latitudes), stride):
        for j in range(0, len(longitudes), stride):

            salinity = values[i, j]

            if np.isfinite(salinity):
                points.append({
                    "latitude": float(latitudes[i]),
                    "longitude": float(longitudes[j]),
                    "salinity": float(salinity)
                })

    return {
        "parameter": "salinity",
        "time": str(data.time.values),
        "depth": float(data.depth.values),
        "data": points
    }
current_file = project_folder / "data" / "indian_ocean_currents.nc"

current_ds = xr.open_dataset(
    current_file,
    engine="netcdf4"
)


def get_current_grid(
    date: str,
    depth: float,
    stride: int = 10
):
    data_u = current_ds["uo"].sel(
        time=date,
        depth=depth,
        method="nearest"
    )

    data_v = current_ds["vo"].sel(
        time=date,
        depth=depth,
        method="nearest"
    )

    latitudes = data_u.latitude.values
    longitudes = data_u.longitude.values

    u_values = data_u.values
    v_values = data_v.values

    points = []

    for i in range(0, len(latitudes), stride):
        for j in range(0, len(longitudes), stride):

            u = u_values[i, j]
            v = v_values[i, j]

            if np.isfinite(u) and np.isfinite(v):

                speed = np.sqrt(u**2 + v**2)

                direction = (
                    np.degrees(np.arctan2(u, v)) + 360
                ) % 360

                points.append({
                    "latitude": float(latitudes[i]),
                    "longitude": float(longitudes[j]),
                    "speed": float(speed),
                    "direction": float(direction)
                })

    return {
        "parameter": "current",
        "time": str(data_u.time.values),
        "depth": float(data_u.depth.values),
        "data": points
    }
wave_file = project_folder / "data" / "indian_ocean_waves.nc"

wave_ds = xr.open_dataset(
    wave_file,
    engine="netcdf4"
)


def get_wave_grid(
    date: str,
    stride: int = 5
):
    data = wave_ds["VHM0"].sel(
        time=date,
        method="nearest"
    )

    latitudes = data.latitude.values
    longitudes = data.longitude.values
    values = data.values

    points = []

    for i in range(0, len(latitudes), stride):
        for j in range(0, len(longitudes), stride):

            wave_height = values[i, j]

            if np.isfinite(wave_height):

                points.append({
                    "latitude": float(latitudes[i]),
                    "longitude": float(longitudes[j]),
                    "significant_wave_height": float(wave_height)
                })

    return {
        "parameter": "significant_wave_height",
        "time": str(data.time.values),
        "unit": "m",
        "data": points
    }