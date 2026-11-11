from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.data_api import (
    get_temperature_grid,
    get_salinity_grid,
    get_current_grid,
    get_wave_grid
)

app = FastAPI(title="Ocean Visualization API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "Ocean Visualization API is running!"
    }


@app.get("/api/ocean/temperature")
def temperature(
    date: str,
    depth: float,
    stride: int = 10
):
    return get_temperature_grid(
        date=date,
        depth=depth,
        stride=stride
    )
@app.get("/api/ocean/salinity")
def salinity(
    date: str,
    depth: float,
    stride: int = 10
):
    return get_salinity_grid(
        date=date,
        depth=depth,
        stride=stride
    )
@app.get("/api/ocean/current")
def current(
    date: str,
    depth: float,
    stride: int = 10
):
    return get_current_grid(
        date=date,
        depth=depth,
        stride=stride
    )
@app.get("/api/ocean/waves")
def waves(
    date: str,
    stride: int = 5
):
    return get_wave_grid(
        date=date,
        stride=stride
    )