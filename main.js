// =====================================================================
// Three.js scene: interactive 1D / 2D / 3D cell grid
// =====================================================================
const scene = new THREE.Scene();

const width = window.innerWidth;
const height = window.innerHeight;
const aspect = width / height;
const frustum = 8;
const camera = new THREE.OrthographicCamera(
    -frustum * aspect, frustum * aspect,
    frustum, -frustum,
    0.1, 1000
);
camera.position.set(10, 9, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(6, 10, 8);
scene.add(dirLight);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);

window.addEventListener('resize', () => {
    const w = window.innerWidth, h = window.innerHeight;
    const a = w / h;
    camera.left = -frustum * a;
    camera.right = frustum * a;
    camera.top = frustum;
    camera.bottom = -frustum;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// =====================================================================
// Cell bookkeeping
// =====================================================================
const cubeSize = 0.85;
const gap = 1.1;
let cellMeshes = [];     // flat list of all meshes currently in the scene
let cellByKey = new Map(); // "d,r,c" -> mesh

function keyOf(coords) { return coords.join(','); }

function valueToColor(val, min, max) {
    const t = max === min ? 0.5 : (val - min) / (max - min);
    const r = Math.floor(t * 93 + (1 - t) * 30);
    const g = Math.floor(t * 202 + (1 - t) * 144);
    const b = Math.floor(t * 165 + (1 - t) * 193);
    return new THREE.Color(r / 255, g / 255, b / 255);
}

function clearCells() {
    cellMeshes.forEach(m => scene.remove(m));
    cellMeshes = [];
    cellByKey.clear();
}

// Recompute each cell's displayed color from its current flags/value.
function refreshCellColor(mesh) {
    const ud = mesh.userData;
    let color;
    if (ud.isBuildCurrent) color = new THREE.Color(0xffe066);
    else if (ud.isMatch) color = new THREE.Color(0xff7849);
    else if (ud.isInRange) color = new THREE.Color(0x4dd2ff);
    else if (ud.isHover) color = ud.baseColor.clone().lerp(new THREE.Color(0xffffff), 0.35);
    else color = ud.baseColor;
    mesh.material.color.copy(color);
    mesh.material.opacity = ud.isBuildDone ? 0.95 : 0.75;
}

function clearTransientFlags() {
    cellMeshes.forEach(m => {
        m.userData.isBuildCurrent = false;
        m.userData.isInRange = false;
        m.userData.isMatch = false;
        m.userData.isBuildDone = false;
        refreshCellColor(m);
    });
}

// Builds the 3D representation for the current dimension/shape/data.
function rebuildVisualization() {
    clearCells();
    const { dim, data } = state;
    const flatVals = flattenData();
    const min = Math.min(...flatVals, 0);
    const max = Math.max(...flatVals, 0);

    const makeCell = (coords, val, pos) => {
        const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, dim === 2 ? 0.35 : cubeSize);
        const baseColor = valueToColor(val, min, max);
        const material = new THREE.MeshStandardMaterial({
            color: baseColor, transparent: true, opacity: 0.75, roughness: 0.6
        });
        const mesh = new THREE.Mesh(geometry, material);
        const edges = new THREE.EdgesGeometry(geometry);
        mesh.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })));
        mesh.position.set(...pos);
        mesh.userData = { coords, value: val, baseColor, dim };
        scene.add(mesh);
        cellMeshes.push(mesh);
        cellByKey.set(keyOf(coords), mesh);
    };

    if (dim === 1) {
        const len = data.length;
        for (let i = 0; i < len; i++) {
            makeCell([i], data[i], [i * gap - (len - 1) * gap / 2, 0, 0]);
        }
    } else if (dim === 2) {
        const rows = data.length, cols = data[0].length;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                makeCell([r, c], data[r][c], [
                    c * gap - (cols - 1) * gap / 2,
                    -(r * gap - (rows - 1) * gap / 2),
                    0
                ]);
            }
        }
    } else {
        const depth = data.length, rows = data[0].length, cols = data[0][0].length;
        for (let d = 0; d < depth; d++) {
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    makeCell([d, r, c], data[d][r][c], [
                        c * gap - (cols - 1) * gap / 2,
                        -(r * gap - (rows - 1) * gap / 2),
                        -(d * gap - (depth - 1) * gap / 2)
                    ]);
                }
            }
        }
    }
}

// =====================================================================
// Hover / click interaction
// =====================================================================
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();
const tooltip = document.getElementById('tooltip');
let hovered = null;

renderer.domElement.addEventListener('mousemove', (e) => {
    mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);
    const hits = raycaster.intersectObjects(cellMeshes, false);

    if (hovered && (!hits.length || hits[0].object !== hovered)) {
        hovered.userData.isHover = false;
        refreshCellColor(hovered);
        hovered = null;
        tooltip.style.display = 'none';
    }
    if (hits.length) {
        const mesh = hits[0].object;
        if (hovered !== mesh) {
            hovered = mesh;
            mesh.userData.isHover = true;
            refreshCellColor(mesh);
        }
        const ud = mesh.userData;
        tooltip.style.display = 'block';
        tooltip.style.left = (e.clientX + 14) + 'px';
        tooltip.style.top = (e.clientY + 14) + 'px';
        tooltip.textContent = `index ${JSON.stringify(ud.coords)}\nvalue: ${ud.value}\n(click to edit)`;
    }
});

renderer.domElement.addEventListener('click', (e) => {
    raycaster.setFromCamera(mouseNDC, camera);
    const hits = raycaster.intersectObjects(cellMeshes, false);
    if (!hits.length) return;
    const mesh = hits[0].object;
    const ud = mesh.userData;
    const next = prompt(`new value for cell ${JSON.stringify(ud.coords)}`, ud.value);
    if (next === null) return;
    const parsed = parseInt(next, 10);
    if (Number.isNaN(parsed)) return;
    setDataAt(ud.coords, parsed);
    ud.value = parsed;
    syncGridInput(ud.coords, parsed);
    rebuildVisualization();
});

// =====================================================================
// App state + dimension/shape/mode handling
// =====================================================================
const state = {
    dim: 1,
    shape: { len: 5 },
    data: [0, 1, 0, 1, 1],
    mode: 'target',
};

const dimSeg = document.getElementById('dimSeg');
const modeSeg = document.getElementById('modeSeg');
const sizeInputs = document.getElementById('sizeInputs');
const dataGridEl = document.getElementById('dataGrid');
const modeInputsEl = document.getElementById('modeInputs');
const resultEl = document.getElementById('result');
const stepInfoEl = document.getElementById('stepInfo');

dimSeg.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    [...dimSeg.children].forEach(b => b.classList.toggle('active', b === btn));
    state.dim = parseInt(btn.dataset.dim, 10);
    renderSizeInputs();
    generateData(defaultShapeFor(state.dim));
    renderModeInputs();
});

modeSeg.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    [...modeSeg.children].forEach(b => b.classList.toggle('active', b === btn));
    state.mode = btn.dataset.mode;
    renderModeInputs();
});

function defaultShapeFor(dim) {
    if (dim === 1) return { len: 5 };
    if (dim === 2) return { rows: 3, cols: 3 };
    return { depth: 2, rows: 2, cols: 2 };
}

function renderSizeInputs() {
    sizeInputs.innerHTML = '';
    const add = (id, label, value, max) => {
        const wrap = document.createElement('div');
        wrap.style.flex = '1';
        wrap.innerHTML = `<label style="font-size:10.5px">${label}</label>
            <input type="number" id="${id}" min="1" max="${max}" value="${value}">`;
        sizeInputs.appendChild(wrap);
    };
    if (state.dim === 1) add('lenInput', 'length', state.shape.len || 5, 12);
    else if (state.dim === 2) {
        add('rowsInput', 'rows', state.shape.rows || 3, 6);
        add('colsInput', 'cols', state.shape.cols || 3, 6);
    } else {
        add('depthInput', 'depth', state.shape.depth || 2, 4);
        add('rowsInput', 'rows', state.shape.rows || 2, 4);
        add('colsInput', 'cols', state.shape.cols || 2, 4);
    }
}

function readShapeInputs() {
    if (state.dim === 1) return { len: clampInt('lenInput', 1, 12) };
    if (state.dim === 2) return { rows: clampInt('rowsInput', 1, 6), cols: clampInt('colsInput', 1, 6) };
    return { depth: clampInt('depthInput', 1, 4), rows: clampInt('rowsInput', 1, 4), cols: clampInt('colsInput', 1, 4) };
}

function clampInt(id, min, max) {
    const el = document.getElementById(id);
    let v = parseInt(el.value, 10);
    if (Number.isNaN(v)) v = min;
    v = Math.max(min, Math.min(max, v));
    el.value = v;
    return v;
}

function makeEmpty(shape, dim, fill) {
    if (dim === 1) return Array.from({ length: shape.len }, fill);
    if (dim === 2) return Array.from({ length: shape.rows }, () => Array.from({ length: shape.cols }, fill));
    return Array.from({ length: shape.depth }, () => Array.from({ length: shape.rows }, () => Array.from({ length: shape.cols }, fill)));
}

function generateData(shape, randomize) {
    state.shape = shape;
    state.data = makeEmpty(shape, state.dim, randomize ? () => Math.floor(Math.random() * 7) - 3 : () => 0);
    renderDataGrid();
    rebuildVisualization();
    resultEl.textContent = '';
    stepInfoEl.textContent = '';
}

document.getElementById('generateBtn').addEventListener('click', () => generateData(readShapeInputs(), false));
document.getElementById('randomizeBtn').addEventListener('click', () => generateData(readShapeInputs(), true));

function setDataAt(coords, val) {
    if (state.dim === 1) state.data[coords[0]] = val;
    else if (state.dim === 2) state.data[coords[0]][coords[1]] = val;
    else state.data[coords[0]][coords[1]][coords[2]] = val;
}

function getDataAt(coords) {
    if (state.dim === 1) return state.data[coords[0]];
    if (state.dim === 2) return state.data[coords[0]][coords[1]];
    return state.data[coords[0]][coords[1]][coords[2]];
}

function syncGridInput(coords, val) {
    const input = dataGridEl.querySelector(`input[data-coords="${keyOf(coords)}"]`);
    if (input) input.value = val;
}

function renderDataGrid() {
    dataGridEl.innerHTML = '';
    const onEdit = (coords, val) => {
        setDataAt(coords, val);
        const mesh = cellByKey.get(keyOf(coords));
        if (mesh) { mesh.userData.value = val; }
        rebuildVisualization();
    };
    const makeInput = (coords, val) => {
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.value = val;
        inp.dataset.coords = keyOf(coords);
        inp.addEventListener('input', () => {
            const v = parseInt(inp.value, 10);
            if (!Number.isNaN(v)) onEdit(coords, v);
        });
        return inp;
    };

    if (state.dim === 1) {
        const row = document.createElement('div');
        row.className = 'gridRow';
        state.data.forEach((v, i) => row.appendChild(makeInput([i], v)));
        dataGridEl.appendChild(row);
    } else if (state.dim === 2) {
        state.data.forEach((rowVals, r) => {
            const row = document.createElement('div');
            row.className = 'gridRow';
            rowVals.forEach((v, c) => row.appendChild(makeInput([r, c], v)));
            dataGridEl.appendChild(row);
        });
    } else {
        state.data.forEach((layer, d) => {
            const label = document.createElement('div');
            label.className = 'layerLabel';
            label.textContent = `layer ${d}`;
            dataGridEl.appendChild(label);
            layer.forEach((rowVals, r) => {
                const row = document.createElement('div');
                row.className = 'gridRow';
                rowVals.forEach((v, c) => row.appendChild(makeInput([d, r, c], v)));
                dataGridEl.appendChild(row);
            });
        });
    }
}

function flattenData() {
    if (state.dim === 1) return state.data.slice();
    if (state.dim === 2) return state.data.flat();
    return state.data.flat(2);
}

// =====================================================================
// Query-mode inputs (target count vs range query)
// =====================================================================
function renderModeInputs() {
    modeInputsEl.innerHTML = '';
    if (state.mode === 'target') {
        modeInputsEl.innerHTML = `<label>target sum</label><input type="number" id="targetInput" value="1">`;
        return;
    }
    const shape = state.shape;
    const addPair = (lowId, lowLabel, hiId, hiLabel, max) => {
        modeInputsEl.innerHTML += `
        <div class="row">
            <div style="flex:1"><label style="font-size:10.5px">${lowLabel}</label><input type="number" id="${lowId}" min="0" max="${max}" value="0"></div>
            <div style="flex:1"><label style="font-size:10.5px">${hiLabel}</label><input type="number" id="${hiId}" min="0" max="${max}" value="${max}"></div>
        </div>`;
    };
    if (state.dim === 1) {
        addPair('leftInput', 'left', 'rightInput', 'right', shape.len - 1);
    } else if (state.dim === 2) {
        addPair('row1Input', 'row1', 'row2Input', 'row2', shape.rows - 1);
        addPair('col1Input', 'col1', 'col2Input', 'col2', shape.cols - 1);
    } else {
        addPair('layer1Input', 'layer1', 'layer2Input', 'layer2', shape.depth - 1);
        addPair('row1Input', 'row1', 'row2Input', 'row2', shape.rows - 1);
        addPair('col1Input', 'col1', 'col2Input', 'col2', shape.cols - 1);
    }
}

// =====================================================================
// WASM engine bridge
// =====================================================================
function buildEngine() {
    const flat = flattenData();
    const ptr = PSM._malloc(flat.length * 4);
    flat.forEach((v, i) => PSM.setValue(ptr + i * 4, v, 'i32'));

    let obj;
    if (state.dim === 1) obj = PSM._createFromArray(ptr, flat.length);
    else if (state.dim === 2) obj = PSM._createFromMatrix(ptr, state.shape.rows, state.shape.cols);
    else obj = PSM._createFromCube(ptr, state.shape.depth, state.shape.rows, state.shape.cols);

    return {
        obj, ptr, flat,
        free() { PSM._destroyPrefixSumMaster(obj); PSM._free(ptr); }
    };
}

function queryRange(engine, bounds) {
    if (state.dim === 1) return PSM._queryArray(engine.obj, bounds.left, bounds.right);
    if (state.dim === 2) return PSM._queryMatrix(engine.obj, bounds.row1, bounds.col1, bounds.row2, bounds.col2);
    return PSM._queryCube(engine.obj, bounds.layer2, bounds.layer1, bounds.row1, bounds.row2, bounds.col1, bounds.col2);
}

// Internal prefix structures are size+1 with a sentinel zero at index 0
// (mPrefixArray[i] holds the sum through raw index i-1), so the value
// "through and including" a raw coordinate lives one slot further in.
function prefixValueAt(engine, coords) {
    if (state.dim === 1) return PSM._getPrefixArrayValue(engine.obj, coords[0] + 1);
    if (state.dim === 2) return PSM._getPrefixMatrixValue(engine.obj, coords[0] + 1, coords[1] + 1);
    return PSM._getPrefixCubeValue(engine.obj, coords[0] + 1, coords[1] + 1, coords[2] + 1);
}

// =====================================================================
// Run button: target-count mode or range-sum mode
// =====================================================================
document.getElementById('runBtn').addEventListener('click', () => {
    clearTransientFlags();
    const engine = buildEngine();

    if (state.mode === 'target') {
        const target = parseInt(document.getElementById('targetInput').value, 10) || 0;
        let count, matches;
        if (state.dim === 1) {
            count = PSM._subArraysSum(engine.obj, engine.ptr, engine.flat.length, target);
            matches = enumerateMatches1D(engine, target);
        } else if (state.dim === 2) {
            count = PSM._subMatricesSum(engine.obj, target);
            matches = enumerateMatches2D(engine, target);
        } else {
            count = PSM._subCubesSum(engine.obj, target);
            matches = enumerateMatches3D(engine, target);
        }
        resultEl.textContent = `sub-${dimNoun()} summing to ${target}: ${count}`;
        animateMatches(matches);
    } else {
        const bounds = readRangeBounds();
        const sum = queryRange(engine, bounds);
        resultEl.textContent = `range sum = ${sum}`;
        highlightRange(bounds);
    }

    engine.free();
});

function dimNoun() {
    return state.dim === 1 ? 'arrays' : state.dim === 2 ? 'matrices' : 'cubes';
}

function readRangeBounds() {
    if (state.dim === 1) return {
        left: clampInt('leftInput', 0, state.shape.len - 1),
        right: clampInt('rightInput', 0, state.shape.len - 1)
    };
    if (state.dim === 2) return {
        row1: clampInt('row1Input', 0, state.shape.rows - 1),
        row2: clampInt('row2Input', 0, state.shape.rows - 1),
        col1: clampInt('col1Input', 0, state.shape.cols - 1),
        col2: clampInt('col2Input', 0, state.shape.cols - 1)
    };
    return {
        layer1: clampInt('layer1Input', 0, state.shape.depth - 1),
        layer2: clampInt('layer2Input', 0, state.shape.depth - 1),
        row1: clampInt('row1Input', 0, state.shape.rows - 1),
        row2: clampInt('row2Input', 0, state.shape.rows - 1),
        col1: clampInt('col1Input', 0, state.shape.cols - 1),
        col2: clampInt('col2Input', 0, state.shape.cols - 1)
    };
}

function cellsInRange1D(b) {
    const out = [];
    for (let i = b.left; i <= b.right; i++) out.push([i]);
    return out;
}
function cellsInRange2D(b) {
    const out = [];
    for (let r = b.row1; r <= b.row2; r++) for (let c = b.col1; c <= b.col2; c++) out.push([r, c]);
    return out;
}
function cellsInRange3D(b) {
    const out = [];
    for (let d = b.layer1; d <= b.layer2; d++) for (let r = b.row1; r <= b.row2; r++) for (let c = b.col1; c <= b.col2; c++) out.push([d, r, c]);
    return out;
}

function highlightRange(bounds) {
    const cells = state.dim === 1 ? cellsInRange1D(bounds) : state.dim === 2 ? cellsInRange2D(bounds) : cellsInRange3D(bounds);
    cells.forEach(coords => {
        const mesh = cellByKey.get(keyOf(coords));
        if (mesh) { mesh.userData.isInRange = true; refreshCellColor(mesh); }
    });
}

// Brute-force enumeration delegates all math to the wasm query bindings
// (the same formulas the engine already uses), so the visualizer never
// re-implements the prefix-sum math itself.
function enumerateMatches1D(engine, target) {
    const matches = [];
    const n = state.shape.len;
    for (let left = 0; left < n; left++)
        for (let right = left; right < n; right++)
            if (PSM._queryArray(engine.obj, left, right) === target) matches.push(cellsInRange1D({ left, right }));
    return matches;
}
function enumerateMatches2D(engine, target) {
    const matches = [];
    const { rows, cols } = state.shape;
    for (let row1 = 0; row1 < rows; row1++)
        for (let row2 = row1; row2 < rows; row2++)
            for (let col1 = 0; col1 < cols; col1++)
                for (let col2 = col1; col2 < cols; col2++)
                    if (PSM._queryMatrix(engine.obj, row1, col1, row2, col2) === target)
                        matches.push(cellsInRange2D({ row1, row2, col1, col2 }));
    return matches;
}
function enumerateMatches3D(engine, target) {
    const matches = [];
    const { depth, rows, cols } = state.shape;
    for (let layer1 = 0; layer1 < depth; layer1++)
        for (let layer2 = layer1; layer2 < depth; layer2++)
            for (let row1 = 0; row1 < rows; row1++)
                for (let row2 = row1; row2 < rows; row2++)
                    for (let col1 = 0; col1 < cols; col1++)
                        for (let col2 = col1; col2 < cols; col2++)
                            if (PSM._queryCube(engine.obj, layer2, layer1, row1, row2, col1, col2) === target)
                                matches.push(cellsInRange3D({ layer1, layer2, row1, row2, col1, col2 }));
    return matches;
}

// Step through found sub-regions one at a time, highlighting each briefly.
function animateMatches(matches) {
    clearTransientFlags();
    if (!matches.length) { stepInfoEl.textContent = 'no matching sub-region found.'; return; }
    let i = 0;
    const stepDelay = Math.max(120, Math.min(600, 1800 / matches.length));
    const step = () => {
        cellMeshes.forEach(m => { m.userData.isMatch = false; refreshCellColor(m); });
        if (i >= matches.length) {
            stepInfoEl.textContent = `highlighted ${matches.length} matching sub-region(s).`;
            matches.forEach(cells => cells.forEach(coords => {
                const mesh = cellByKey.get(keyOf(coords));
                if (mesh) { mesh.userData.isMatch = true; refreshCellColor(mesh); }
            }));
            return;
        }
        matches[i].forEach(coords => {
            const mesh = cellByKey.get(keyOf(coords));
            if (mesh) { mesh.userData.isMatch = true; refreshCellColor(mesh); }
        });
        stepInfoEl.textContent = `match ${i + 1}/${matches.length}: indices ${matches[i].map(c => JSON.stringify(c)).join(' ')}`;
        i++;
        setTimeout(step, stepDelay);
    };
    step();
}

// =====================================================================
// Animate the prefix-sum build itself, mirroring the engine's own loop
// order and reading back each intermediate value from the wasm object.
// =====================================================================
document.getElementById('animateBtn').addEventListener('click', () => {
    clearTransientFlags();
    const engine = buildEngine();
    const order = buildOrder();
    let i = 0;
    const stepDelay = Math.max(150, Math.min(700, 2500 / Math.max(order.length, 1)));

    const step = () => {
        if (i > 0) {
            const prev = cellByKey.get(keyOf(order[i - 1]));
            if (prev) { prev.userData.isBuildCurrent = false; prev.userData.isBuildDone = true; refreshCellColor(prev); }
        }
        if (i >= order.length) {
            stepInfoEl.textContent = `prefix-sum build complete (${order.length} cells processed).`;
            engine.free();
            return;
        }
        const coords = order[i];
        const mesh = cellByKey.get(keyOf(coords));
        if (mesh) { mesh.userData.isBuildCurrent = true; refreshCellColor(mesh); }
        const prefixVal = prefixValueAt(engine, coords);
        stepInfoEl.textContent = `processing ${JSON.stringify(coords)} -> running prefix sum = ${prefixVal}`;
        i++;
        setTimeout(step, stepDelay);
    };
    step();
});

function buildOrder() {
    if (state.dim === 1) return Array.from({ length: state.shape.len }, (_, i) => [i]);
    if (state.dim === 2) {
        const out = [];
        for (let r = 0; r < state.shape.rows; r++) for (let c = 0; c < state.shape.cols; c++) out.push([r, c]);
        return out;
    }
    const out = [];
    for (let d = 0; d < state.shape.depth; d++)
        for (let r = 0; r < state.shape.rows; r++)
            for (let c = 0; c < state.shape.cols; c++) out.push([d, r, c]);
    return out;
}

// =====================================================================
// Boot
// =====================================================================
PrefixSumModule().then((Module) => {
    window.PSM = Module;
    renderSizeInputs();
    renderDataGrid();
    renderModeInputs();
    rebuildVisualization();
});
