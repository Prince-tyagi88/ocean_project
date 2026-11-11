import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';



// SCENE


const scene = new THREE.Scene();

scene.background = new THREE.Color(0x9bd7e8);


// ==================================================
// CAMERA
// ==================================================

const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
);

camera.position.set(0, 42, 62);


// ==================================================
// RENDERER
// ==================================================

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

document.body.appendChild(renderer.domElement);


// ==================================================
// CONTROLS
// ==================================================

const controls = new OrbitControls(
    camera,
    renderer.domElement
);

controls.enableDamping = true;

controls.dampingFactor = 0.05;

controls.minDistance = 10;
controls.maxDistance = 150;

controls.target.set(0, 0, 0);



// LIGHTING


const ambientLight =
    new THREE.AmbientLight(
        0xffffff,
        1.0
    );

scene.add(ambientLight);


const directionalLight =
    new THREE.DirectionalLight(
        0xffffff,
        2.5
    );

directionalLight.position.set(
    20,
    50,
    20
);

scene.add(directionalLight);



// OCEAN VARIABLES

let oceanMesh = null;

let originalPositions = null;
let currentParticles = [];
let activeParameter = "temperature";
let waveStrengths = [];
let currentOceanData = null;
let selectedMarker = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const pointInfo = document.getElementById("point-info");
const pointLocation = document.getElementById("point-location");
const pointValue = document.getElementById("point-value");


// LOAD TEMPERATURE DATA

function updateLegend(parameter, minValue, maxValue) {

    const settings = {

        temperature: {
            title: "Water Temperature",
            unit: "°C"
        },

        salinity: {
            title: "Salinity",
            unit: "PSU"
        },

        current: {
            title: "Current Speed",
            unit: "m/s"
        },

        waves: {
            title: "Significant Wave Height",
            unit: "m"
        }

    };

    const setting = settings[parameter];

    if (!setting) {
        return;
    }

    legendTitle.textContent =
        setting.title;

    legendUnit.textContent =
        setting.unit;

    legendMin.textContent =
        Number(minValue).toFixed(2);

    legendMax.textContent =
        Number(maxValue).toFixed(2);
}
function createGeoGrid() {

    // Remove previous grid
    const oldGrid = scene.getObjectByName("geoGrid");

    if (oldGrid) {
        scene.remove(oldGrid);

        oldGrid.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }

    const group = new THREE.Group();
    group.name = "geoGrid";

    // Same geographic bounds as our dataset
    const minLon = 40;
    const maxLon = 110;
    const minLat = -20;
    const maxLat = 25;

    const scale = 0.8;

    const material = new THREE.LineBasicMaterial({
        color: 0x4b708c,
        transparent: true,
        opacity: 0.35
    });

    // Longitude lines
    for (let lon = minLon; lon <= maxLon; lon += 10) {

        const points = [];

        for (let lat = minLat; lat <= maxLat; lat += 1) {

            const x = (lon - minLon) * scale;
            const z = (lat - minLat) * scale;

            points.push(
                new THREE.Vector3(x, 0.15, z)
            );
        }

        const geometry = new THREE.BufferGeometry()
            .setFromPoints(points);

        const line = new THREE.Line(geometry, material);
        group.add(line);
    }

    // Latitude lines
    for (let lat = minLat; lat <= maxLat; lat += 5) {

        const points = [];

        for (let lon = minLon; lon <= maxLon; lon += 1) {

            const x = (lon - minLon) * scale;
            const z = (lat - minLat) * scale;

            points.push(
                new THREE.Vector3(x, 0.15, z)
            );
        }

        const geometry = new THREE.BufferGeometry()
            .setFromPoints(points);

        const line = new THREE.Line(geometry, material);
        group.add(line);
    }

    scene.add(group);
}
function createGeoLabels() {

    // Remove old labels
    const oldLabels = scene.getObjectByName("geoLabels");

    if (oldLabels) {
        scene.remove(oldLabels);

        oldLabels.traverse((child) => {
            if (child.material?.map) {
                child.material.map.dispose();
            }

            if (child.material) {
                child.material.dispose();
            }
        });
    }

    const group = new THREE.Group();
    group.name = "geoLabels";

    const scale = 0.8;
    const minLon = 40;
    const minLat = -20;

    function createLabel(text, lon, lat, size = 28) {

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = 512;
        canvas.height = 128;

        context.clearRect(0, 0, canvas.width, canvas.height);

        context.font = `bold ${size}px Arial`;
        context.textAlign = "center";
        context.textBaseline = "middle";

        // Slight dark background for readability
        context.fillStyle = "rgba(0, 0, 0, 0.45)";
        context.roundRect(50, 25, 412, 78, 18);
        context.fill();

        context.fillStyle = "white";
        context.fillText(text, 256, 64);

        const texture = new THREE.CanvasTexture(canvas);

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });

        const sprite = new THREE.Sprite(material);

        const x = (lon - minLon) * scale;
        const z = (lat - minLat) * scale;

        sprite.position.set(x, 2.5, z);

        sprite.scale.set(10, 2.5, 1);

        group.add(sprite);
    }

    // Geographic labels
    createLabel("INDIA", 78, 22, 32);
    createLabel("ARABIAN SEA", 62, 14, 24);
    createLabel("BAY OF BENGAL", 90, 15, 24);
    createLabel("INDIAN OCEAN", 75, -5, 28);

    scene.add(group);
}
function createLand() {

    const oldLand = scene.getObjectByName("landLayer");

    if (oldLand) {
        scene.remove(oldLand);

        oldLand.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }

    fetch("/ne_50m_land.geojson")
        .then(response => response.json())
        .then(geojson => {

            const landGroup = new THREE.Group();
            landGroup.name = "landLayer";

            const landMaterial = new THREE.MeshBasicMaterial({
                color: 0x6f8f45,
                side: THREE.DoubleSide
            });

            const minLon = 40;
            const minLat = -20;
            const maxLon = 110;
            const maxLat = 25;
            const scale = 0.8;

            function convertPoint(coord) {

                const lon = coord[0];
                const lat = coord[1];

                return new THREE.Vector2(
                    (lon - minLon) * scale,
                    (lat - minLat) * scale
                );
            }

            function createPath(ring) {

                const path = new THREE.Path();

                ring.forEach((coord, index) => {

                    const point = convertPoint(coord);

                    if (index === 0) {
                        path.moveTo(point.x, point.y);
                    } else {
                        path.lineTo(point.x, point.y);
                    }

                });

                path.closePath();

                return path;
            }

            function pointInsideView(coord) {

                const lon = coord[0];
                const lat = coord[1];

                return (
                    lon >= minLon &&
                    lon <= maxLon &&
                    lat >= minLat &&
                    lat <= maxLat
                );
            }

            geojson.features.forEach(feature => {

                if (!feature.geometry) return;

                const geometry = feature.geometry;

                let polygons = [];

                if (geometry.type === "Polygon") {

                    polygons.push(
                        geometry.coordinates
                    );

                } else if (geometry.type === "MultiPolygon") {

                    polygons = geometry.coordinates;

                } else {

                    return;
                }

                polygons.forEach(polygon => {

                    if (!polygon || polygon.length === 0) {
                        return;
                    }

                    const outerRing = polygon[0];

                    if (!outerRing || outerRing.length < 3) {
                        return;
                    }

                    // Check whether this polygon is relevant
                    // to our Indian Ocean view.
                    const relevant = outerRing.some(
                        pointInsideView
                    );

                    if (!relevant) {
                        return;
                    }

                    const shape = new THREE.Shape();

                    // --------------------------------
                    // OUTER RING
                    // --------------------------------

                    outerRing.forEach((coord, index) => {

                        const point =
                            convertPoint(coord);

                        if (index === 0) {

                            shape.moveTo(
                                point.x,
                                point.y
                            );

                        } else {

                            shape.lineTo(
                                point.x,
                                point.y
                            );

                        }

                    });

                    shape.closePath();

                    // --------------------------------
                    // HOLES
                    // --------------------------------

                    for (
                        let h = 1;
                        h < polygon.length;
                        h++
                    ) {

                        const holeRing =
                            polygon[h];

                        if (
                            !holeRing ||
                            holeRing.length < 3
                        ) {
                            continue;
                        }

                        const hole =
                            createPath(holeRing);

                        shape.holes.push(hole);
                    }

                    // --------------------------------
                    // THREE.JS GEOMETRY
                    // --------------------------------

                    const landGeometry =
                        new THREE.ShapeGeometry(shape);

                    const landMesh =
                        new THREE.Mesh(
                            landGeometry,
                            landMaterial
                        );

                    // ShapeGeometry is created in XY.
                    // Rotate it onto our XZ ocean plane.
                    landMesh.rotation.x =
                        -Math.PI / 2;

                    landMesh.position.y =
                        0.25;

                    landGroup.add(landMesh);

                });

            });

            scene.add(landGroup);

            console.log(
                "Land layer loaded:",
                landGroup.children.length,
                "polygons"
            );

        })
        .catch(error => {

            console.error(
                "Land loading error:",
                error
            );

        });
}
async function loadOceanData() {
    const date = dateInput.value;
    const depth = depthSelect.value;
    const parameter = parameterSelect.value;

   let url;

if (parameter === "temperature") {
    url =
        'http://127.0.0.1:8000/api/ocean/temperature' +
        `?date=${date}&depth=${depth}&stride=10`;

} else if (parameter === "salinity") {
    url =
        'http://127.0.0.1:8000/api/ocean/salinity' +
        `?date=${date}&depth=${depth}&stride=10`;

} else if (parameter === "current") {
    url =
        'http://127.0.0.1:8000/api/ocean/current' +
        `?date=${date}&depth=${depth}&stride=25`;

} else if (parameter === "waves") {
    url =
        'http://127.0.0.1:8000/api/ocean/waves' +
        `?date=${date}&stride=5`;
}

    console.log("Loading:", url);

    status.textContent = "Loading data...";

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const oceanData = await response.json();

        console.log("Depth selected:", depth);
        console.log("Received depth:", oceanData.depth);
        console.log("Points:", oceanData.data.length);
       createOceanSurface(oceanData, parameter);

if (parameter === "current") {
    createCurrentFlow(oceanData);
} else {
    for (const arrow of currentParticles) {
        scene.remove(arrow);
    }

    currentParticles = [];
}
        status.textContent =
            `Loaded ${parameter} | Depth: ${oceanData.depth} m`;

    } catch (error) {
        console.error(error);
        status.textContent = "Error loading data";
    }
}



// CREATE OCEAN SURFACE


function createOceanSurface(oceanData, parameter) {
     currentOceanData = oceanData;
    activeParameter = parameter;
waveStrengths = [];

    // ------------------------------------------------
    // REMOVE PREVIOUS SURFACE
    // ------------------------------------------------

    if (oceanMesh) {
        scene.remove(oceanMesh);

        oceanMesh.geometry.dispose();
        oceanMesh.material.dispose();

        oceanMesh = null;
    }


    // ------------------------------------------------
    // GET DATA
    // ------------------------------------------------

    const points = oceanData.data;

    if (!points.length) {
        console.error("No ocean data available.");
        return;
    }


    // ------------------------------------------------
    // LATITUDE / LONGITUDE
    // ------------------------------------------------

    const latitudes = [
        ...new Set(
            points.map(p => p.latitude)
        )
    ].sort(
        (a, b) => a - b
    );


    const longitudes = [
        ...new Set(
            points.map(p => p.longitude)
        )
    ].sort(
        (a, b) => a - b
    );


    console.log(
        "Latitude points:",
        latitudes.length
    );

    console.log(
        "Longitude points:",
        longitudes.length
    );


    // ------------------------------------------------
    // GET VALUE ACCORDING TO PARAMETER
    // ------------------------------------------------

    function getValue(point) {

        if (parameter === "temperature") {
            return point.temperature;
        }

        if (parameter === "salinity") {
            return point.salinity;
        }

        if (parameter === "current") {
            return point.speed;
        }

        if (parameter === "waves") {
            return point.significant_wave_height;
        }

        return undefined;
    }


    // ------------------------------------------------
    // CREATE VALUE ARRAY
    // ------------------------------------------------

    const values = points
        .map(point => getValue(point))
        .filter(value => Number.isFinite(value));


    if (!values.length) {
        console.error(
            "No valid values found for:",
            parameter
        );
        return;
    }


    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    updateLegend(
    parameter,
    minValue,
    maxValue
);


    console.log(
        `${parameter} minimum:`,
        minValue
    );

    console.log(
        `${parameter} maximum:`,
        maxValue
    );


    // ------------------------------------------------
    // LOOKUP TABLE
    // ------------------------------------------------

    const dataMap = new Map();


    for (const point of points) {

        const key =
            `${point.latitude},${point.longitude}`;

        const value =
            getValue(point);

        if (Number.isFinite(value)) {
            dataMap.set(key, value);
        }
    }


    // ------------------------------------------------
    // GEOMETRY ARRAYS
    // ------------------------------------------------

    const positions = [];
    const colors = [];
    const indices = [];

    const vertexIndex = new Map();

    let index = 0;


    // ------------------------------------------------
    // CREATE VERTICES
    // ------------------------------------------------

    for (
        let i = 0;
        i < latitudes.length;
        i++
    ) {

        for (
            let j = 0;
            j < longitudes.length;
            j++
        ) {

            const lat =
                latitudes[i];

            const lon =
                longitudes[j];


            const key =
                `${lat},${lon}`;


            const value =
                dataMap.get(key);


            if (value === undefined) {
                continue;
            }


            // ----------------------------------------
            // GEO → 3D
            // ----------------------------------------

            const x =
                (lon - longitudes[0]) * 0.8;

            const z =
                (lat - latitudes[0]) * 0.8;

            const y = 0;


            positions.push(
                x,
                y,
                z
            );
            let waveStrength = 0;

if (parameter === "waves" && maxValue !== minValue) {
    waveStrength =
        (value - minValue) /
        (maxValue - minValue);
}

waveStrengths.push(waveStrength);


            vertexIndex.set(
                key,
                index
            );


            // ----------------------------------------
            // VALUE → COLOUR
            // ----------------------------------------

            let normalized = 0.5;


            if (maxValue !== minValue) {

                normalized =
                    (
                        value - minValue
                    ) /
                    (
                        maxValue - minValue
                    );

            }


            const color =
                new THREE.Color();


            color.setHSL(
                0.65 - normalized * 0.65,
                0.85,
                0.5
            );


            colors.push(
                color.r,
                color.g,
                color.b
            );


            index++;
        }
    }


    // ------------------------------------------------
    // CREATE TRIANGLES
    // ------------------------------------------------

    for (
        let i = 0;
        i < latitudes.length - 1;
        i++
    ) {

        for (
            let j = 0;
            j < longitudes.length - 1;
            j++
        ) {

            const aKey =
                `${latitudes[i]},${longitudes[j]}`;

            const bKey =
                `${latitudes[i]},${longitudes[j + 1]}`;

            const cKey =
                `${latitudes[i + 1]},${longitudes[j]}`;

            const dKey =
                `${latitudes[i + 1]},${longitudes[j + 1]}`;


            const a =
                vertexIndex.get(aKey);

            const b =
                vertexIndex.get(bKey);

            const c =
                vertexIndex.get(cKey);

            const d =
                vertexIndex.get(dKey);


            if (
                a !== undefined &&
                b !== undefined &&
                c !== undefined &&
                d !== undefined
            ) {

                indices.push(
                    a,
                    b,
                    d,

                    a,
                    d,
                    c
                );

            }
        }
    }


    // ------------------------------------------------
    // BUILD BUFFER GEOMETRY
    // ------------------------------------------------

    const geometry =
        new THREE.BufferGeometry();


    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(
            positions,
            3
        )
    );


    geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(
            colors,
            3
        )
    );


    geometry.setIndex(indices);

    geometry.computeVertexNormals();


    // ------------------------------------------------
    // SAVE ORIGINAL POSITIONS
    // ------------------------------------------------

    originalPositions =
        geometry.attributes.position
            .array
            .slice();


    // ------------------------------------------------
    // MATERIAL
    // ------------------------------------------------

   const material =
    new THREE.MeshStandardMaterial({

        vertexColors: true,

        side: THREE.DoubleSide,

        roughness: 0.22,

        metalness: 0.02,

        transparent: true,

        opacity: 0.92
    });


    // ------------------------------------------------
    // CREATE MESH
    // ------------------------------------------------

    oceanMesh =
        new THREE.Mesh(
            geometry,
            material
        );


    scene.add(oceanMesh);


    console.log(
        `${parameter} 3D surface created successfully.`
    );

}

function createCurrentFlow(oceanData) {

    // Remove old current arrows
    for (const arrow of currentParticles) {
        scene.remove(arrow);
        arrow.dispose();
    }

    currentParticles = [];

    if (!oceanData || !oceanData.data) {
        return;
    }

    const scale = 0.8;
    const minLon = 40;
    const minLat = -20;

    for (const point of oceanData.data) {

        const speed = point.speed;

        if (!Number.isFinite(speed)) {
            continue;
        }

        // Convert current direction to 3D direction
        const angle = THREE.MathUtils.degToRad(point.direction);

        const direction = new THREE.Vector3(
            Math.sin(angle),
            0,
            Math.cos(angle)
        ).normalize();

        // Keep arrows readable
        const length = THREE.MathUtils.clamp(
            speed * 12,
            1.0,
            5.0
        );

        const x = (point.longitude - minLon) * scale;
        const z = (point.latitude - minLat) * scale;

        const origin = new THREE.Vector3(
            x,
            1.2,
            z
        );

        const arrow = new THREE.ArrowHelper(
            direction,
            origin,
            length,
            0x66ccff,
            length * 0.25,
            length * 0.15
        );

        scene.add(arrow);

        currentParticles.push(arrow);
    }

    console.log(
        `Current flow rendered: ${currentParticles.length} arrows`
    );
}


// ANIMATE OCEAN

const clock =
    new THREE.Clock();

window.addEventListener("click", onOceanClick);

function onOceanClick(event) {

    if (!oceanMesh) {
        return;
    }

    // Convert mouse position to Three.js normalized coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersections = raycaster.intersectObject(oceanMesh);

    if (intersections.length === 0) {
        return;
    }
  const point = intersections[0].point;

showSelectedMarker(point);

const scale = 0.8;

    const minLon = 40;
    const minLat = -20;

    const longitude = point.x / scale + minLon;
    const latitude = point.z / scale + minLat;

    showPointInfo(latitude, longitude);
}
function showPointInfo(latitude, longitude) {

    const lat = Math.max(-20, Math.min(25, latitude));
    const lon = Math.max(40, Math.min(110, longitude));

    pointLocation.textContent =
        `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;

    const point = getNearestPoint(lat, lon);

    if (!point) {
        pointValue.textContent = "No data available";
        return;
    }

    if (activeParameter === "temperature") {

        pointValue.textContent =
            `Temperature: ${point.temperature.toFixed(2)} °C`;

    }

    else if (activeParameter === "salinity") {

        pointValue.textContent =
            `Salinity: ${point.salinity.toFixed(2)} PSU`;

    }

    else if (activeParameter === "current") {

        pointValue.innerHTML =
            `Speed: ${point.speed.toFixed(2)} m/s<br>` +
            `Direction: ${point.direction.toFixed(1)}°`;

    }

    else if (activeParameter === "waves") {

        pointValue.textContent =
            `Wave Height: ${point.significant_wave_height.toFixed(2)} m`;

    }
}
function getNearestPoint(latitude, longitude) {

    if (!currentOceanData || !currentOceanData.data) {
        return null;
    }

    let nearestPoint = null;
    let nearestDistance = Infinity;

    for (const point of currentOceanData.data) {

        const latDiff = point.latitude - latitude;
        const lonDiff = point.longitude - longitude;

        const distance =
            latDiff * latDiff +
            lonDiff * lonDiff;

        if (distance < nearestDistance) {

            nearestDistance = distance;
            nearestPoint = point;
        }
    }

    return nearestPoint;
}
function getNearestValue(latitude, longitude) {

    const point = getNearestPoint(latitude, longitude);

    if (!point) {
        return 0;
    }

    if (activeParameter === "temperature") {
        return point.temperature;
    }

    if (activeParameter === "salinity") {
        return point.salinity;
    }

    if (activeParameter === "current") {
        return point.speed;
    }

    if (activeParameter === "waves") {
        return point.significant_wave_height;
    }

    return 0;
}
function showSelectedMarker(point) {

    // Remove previous marker
    if (selectedMarker) {
        scene.remove(selectedMarker);

        if (selectedMarker.geometry) {
            selectedMarker.geometry.dispose();
        }

        if (selectedMarker.material) {
            selectedMarker.material.dispose();
        }

        selectedMarker = null;
    }

    // Create new marker
    const geometry = new THREE.SphereGeometry(0.7, 16, 16);

    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff
    });

    selectedMarker = new THREE.Mesh(
        geometry,
        material
    );

    selectedMarker.position.copy(point);

    // Put marker slightly above surface
    selectedMarker.position.y += 0.8;

    scene.add(selectedMarker);
}
function animateOcean() {

    if (!oceanMesh || !originalPositions) {
        return;
    }

    const time = clock.getElapsedTime();

    const positionAttribute =
        oceanMesh.geometry.attributes.position;

    const positions =
        positionAttribute.array;

    for (let i = 0; i < positions.length; i += 3) {

        const x = originalPositions[i];
        const z = originalPositions[i + 2];

        let height = 0;

        // ==========================================
        // WAVE DATA MODE
        // ==========================================

        if (activeParameter === "waves") {

            const vertexNumber = i / 3;

            const strength =
                waveStrengths[vertexNumber] ?? 0;

            const wave1 =
                Math.sin(
                    x * 0.22 +
                    time * 1.1
                ) * 0.65 * strength;

            const wave2 =
                Math.sin(
                    z * 0.28 +
                    time * 0.85
                ) * 0.45 * strength;

            const wave3 =
                Math.sin(
                    (x + z) * 0.12 +
                    time * 0.65
                ) * 0.30 * strength;

            height =
                wave1 +
                wave2 +
                wave3;
        }

        // ==========================================
        // OTHER PARAMETERS
        // ==========================================

        else {

            const wave1 =
                Math.sin(
                    x * 0.22 +
                    time * 0.8
                ) * 0.20;

            const wave2 =
                Math.sin(
                    z * 0.28 +
                    time * 0.65
                ) * 0.12;

            const wave3 =
                Math.sin(
                    (x + z) * 0.12 +
                    time * 0.5
                ) * 0.08;

            height =
                wave1 +
                wave2 +
                wave3;
        }

        positions[i + 1] = height;
    }

    positionAttribute.needsUpdate = true;

    // Recalculate lighting normals after deformation
    oceanMesh.geometry.computeVertexNormals();
}

// MAIN ANIMATION LOOP

function createWaterBase() {
    const oldWater = scene.getObjectByName("waterBase");

    if (oldWater) {
        scene.remove(oldWater);

        if (oldWater.geometry) oldWater.geometry.dispose();
        if (oldWater.material) oldWater.material.dispose();
    }

    const width = (110 - 40) * 0.8;
    const depth = (25 - (-20)) * 0.8;
    const waterHeight = 6;

    const geometry = new THREE.BoxGeometry(
        width,
        waterHeight,
        depth
    );

    const material = new THREE.MeshStandardMaterial({
        color: 0x167a9b,
        transparent: false,
        opacity: 1,
        roughness: 0.35,
        metalness: 0.02
    });

    const water = new THREE.Mesh(
        geometry,
        material
    );

    water.name = "waterBase";

    water.position.set(
        width / 2,
        -waterHeight / 2 - 0.3,
        depth / 2
    );

    scene.add(water);
}
function animate() {

    requestAnimationFrame(
        animate
    );


  //s  animateOcean();


    controls.update();


    renderer.render(
        scene,
        camera
    );

}


animate();



// RESIZE


window.addEventListener(
    'resize',
    () => {

        camera.aspect =
            window.innerWidth /
            window.innerHeight;


        camera.updateProjectionMatrix();


        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

    }
);


const parameterSelect =
    document.getElementById('parameter');

const dateInput =
    document.getElementById('date');

const depthSelect =
    document.getElementById('depth');

const loadButton =
    document.getElementById('load');

const status =
    document.getElementById('status');
const legendTitle =
    document.getElementById('legend-title');

const legendMin =
    document.getElementById('legend-min');

const legendMax =
    document.getElementById('legend-max');

const legendUnit =
    document.getElementById('legend-unit');


// ==================================================
// LOAD BUTTON
// ==================================================

loadButton.addEventListener(
    'click',
    async () => {

        status.textContent =
            "Loading ocean data...";

        await loadOceanData();

        status.textContent =
            "Data loaded.";

    }
);


// ==================================================
// START
// ==================================================
createWaterBase();
createGeoGrid();
createGeoLabels();
createCoastline();
createLand();
loadOceanData();