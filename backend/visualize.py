import xarray as xr
import matplotlib.pyplot as plt
from pathlib import Path

# Find the project folder automatically
project_folder = Path(__file__).resolve().parent.parent

# Location of our NetCDF file
data_file = project_folder / "data" / "ocean_temperature.nc"

print("Opening:", data_file)

# Open the NetCDF file
ds = xr.open_dataset(data_file, engine="netcdf4")

# Get temperature
temperature = ds["thetao"]

# Select first depth and first time
surface_temperature = temperature.isel(depth=0, time=0)

# Create the plot
surface_temperature.plot()

plt.title("Ocean Surface Temperature")
plt.xlabel("Longitude")
plt.ylabel("Latitude")

plt.show()