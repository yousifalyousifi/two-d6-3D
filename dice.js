var enableControls = false;
var EPSILON = 0.001;
var world;
var cannonDebugRenderer;
var dt = 1 / 60;

var container, camera, scene, renderer;
var controls, time = Date.now();

var staticMaterial;

var diceBodyMaterial, deskBodyMaterial, barrierBodyMaterial;

// To be synced
var meshes = [], bodies = [];
var displayDiceMeshes = [];
var displayDieRedMesh, displayDieYellowMesh;

//Static, sync not required
var staticMeshes=[], staticBodies=[];

var groundLocation = new THREE.Vector3(20,0,0);

var diceBoxSize = 20;

var resultsDeadlineTimeout;
var stoppedCheckInterval;
var resultsTable = {};

function createMaterial(numOfFaces, fontColor, backColor) {
    let customMaterialOptions = {
        specular: 0x172022,
        shininess: 1,
        flatShading: true
    };
    let material = [];
    for(let i = 1; i <= numOfFaces; i++) {
        material.push(new THREE.MeshPhongMaterial(
            Object.assign(customMaterialOptions, 
                {map: create_text_texture(i, fontColor, backColor)})));
    }
    return material;
}

function createDisplayDice() {

    let redMaterial = createMaterial(6,"#FFFF00", "#FF0000");

    let yellowMaterial = createMaterial(6,"#FF0000", "#FFFF00");

    let boxGeometry = new THREE.BoxGeometry( 1, 1, 1, 1, 1 );

    let displayDieRedMesh = new THREE.Mesh(boxGeometry, redMaterial);
    displayDieRedMesh.castShadow = true;
    displayDieRedMesh.position.copy(groundLocation)
    displayDieRedMesh.position.y += 10
    displayDieRedMesh.position.x -= 1
    scene.add(displayDieRedMesh);

    let displayDieYellowMesh = new THREE.Mesh(boxGeometry, yellowMaterial);
    displayDieYellowMesh.castShadow = true;
    displayDieYellowMesh.position.copy(groundLocation)
    displayDieYellowMesh.position.y += 10
    displayDieYellowMesh.position.x += 1
    scene.add(displayDieYellowMesh);

    displayDiceMeshes.push(displayDieRedMesh);
    displayDiceMeshes.push(displayDieYellowMesh);

}

initInput();
initCannon();
initThree();
createDiceBox();
createDisplayDice();
animate();

function rand() {
    return Math.random();
}

function log() {
     return console.log.apply( console, arguments );
}

function initCannon(){
    // Setup our world
    world = new CANNON.World();
    world.quatNormalizeSkip = 0;
    world.quatNormalizeFast = false;

    world.gravity.set(0,-9.81 * 1,0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 16;

    //from teal's dice roller
    diceBodyMaterial = new CANNON.Material();
    deskBodyMaterial = new CANNON.Material();
    barrierBodyMaterial = new CANNON.Material();
    world.addContactMaterial(new CANNON.ContactMaterial(
        deskBodyMaterial, diceBodyMaterial, {friction: 0.001, restitution: 0.1}));
    world.addContactMaterial(new CANNON.ContactMaterial(
        barrierBodyMaterial, diceBodyMaterial, {friction: 0, restitution: 0.2}));
    world.addContactMaterial(new CANNON.ContactMaterial(
        diceBodyMaterial, diceBodyMaterial, {friction: 0.0, restitution: 0.2}));
}

function initThree() {

    container = document.createElement( 'div' );
    document.body.appendChild( container );


    // scene
    scene = new THREE.Scene();

    // camera
    let w = 20;
    let h = w * window.innerHeight / window.innerWidth;
    camera = new THREE.OrthographicCamera( w / - 2, w / 2, h / 2, h / - 2, 0.1, 10000 );
    camera.position.set(groundLocation.x,25,25)
    camera.lookAt(groundLocation);
    scene.add(camera);

    // lights
    scene.add( new THREE.AmbientLight( 0x666666 ) );
    let light;
    let d = 6;
    let pos = groundLocation.clone();
    light = new THREE.DirectionalLight( 0xffffff, 1.35 );
    light.position.set( pos.x,pos.y+15,pos.z );
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.left = -d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = -d;
    light.shadow.camera.far = 3*d;
    light.shadow.camera.near = 0.1;
    var target = new THREE.Object3D();
    target.position.copy(groundLocation);
    light.target = target;
    // scene.add(target);
    // scene.add( light );
    // scene.add(new THREE.CameraHelper( light.shadow.camera ))

    light = new THREE.DirectionalLight( 0xffffff, 1.00 );
    light.position.set( pos.x+5,pos.y+15,pos.z );
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.left = -d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = -d;
    light.shadow.camera.far = 3*d;
    light.shadow.camera.near = 0.1;
    var target = new THREE.Object3D();
    target.position.copy(groundLocation);
    light.target = target;
    scene.add(target);
    scene.add( light );
    scene.add(new THREE.CameraHelper( light.shadow.camera ))

    // floor shadow catcher
    let geometry = new THREE.PlaneGeometry( 10, 10, 1, 1 );
    let material = new THREE.ShadowMaterial({opacity: 0.5});
    let floorMesh = new THREE.Mesh( geometry, material );
    floorMesh.castShadow = true;
    floorMesh.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0), -Math.PI / 2);
    floorMesh.receiveShadow = true;
    floorMesh.position.copy(groundLocation)
    scene.add(floorMesh);

    renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
    renderer.setClearColor( 0x000000, 0 ); // the default
    renderer.setSize( window.innerWidth, window.innerHeight );
    cannonDebugRenderer = new THREE.CannonDebugRenderer( scene, world );

    container.appendChild( renderer.domElement );

    if(enableControls) { controls = new THREE.OrbitControls( camera, renderer.domElement ); }

    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.shadowMap.enabled = true;

    window.addEventListener( 'resize', onWindowResize, false );
}

function createDiceBox() {

    let wallPos = diceBoxSize / 2;

    //floor
    var groundShape = new CANNON.Plane();
    var groundBody = new CANNON.Body({ mass: 0, material: deskBodyMaterial });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    world.addBody(groundBody);

    //side1
    groundBody = new CANNON.Body({ mass: 0, material: barrierBodyMaterial});
    groundBody.position.set(0,wallPos,wallPos);
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0),Math.PI);
    world.addBody(groundBody);

    //side2
    groundBody = new CANNON.Body({ mass: 0, material: barrierBodyMaterial});
    groundBody.position.set(0,wallPos,-wallPos);
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0),0);
    world.addBody(groundBody);

    //back
    groundBody = new CANNON.Body({ mass: 0, material: barrierBodyMaterial});
    groundBody.position.set(wallPos,wallPos,0);
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0),-Math.PI/2);
    world.addBody(groundBody);

    //front
    groundBody = new CANNON.Body({ mass: 0, material: barrierBodyMaterial});
    groundBody.position.set(-wallPos,wallPos,0);
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0,1,0),Math.PI/2);
    // groundBody.quaternion.setFromEuler(Math.PI/9, Math.PI/2, 0, "YXZ");
    world.addBody(groundBody);

    //top
    groundBody = new CANNON.Body({ mass: 0, material: barrierBodyMaterial });
    groundBody.position.set(0,20,0);
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),Math.PI/2);
    world.addBody(groundBody);

}

function throwTwoD6Dice() {

    var mass = 100, radius = 1.3;
    let materials = createMaterial(6,"#FFFFFF", "#000000");

    // Create boxes
    boxShape = new CANNON.Box(new CANNON.Vec3(0.5,0.5,0.5));
    let boxBody = new CANNON.Body({ mass: mass, material: diceBodyMaterial });
    boxBody.addShape(boxShape);
    boxBody.position.set(1,2,0);
    let quat = new THREE.Quaternion()
    .setFromUnitVectors(
        new THREE.Vector3(0,1,0),
        new THREE.Vector3(rand()*2-1, rand()*2-1, rand()*2-1).normalize());
        // new THREE.Vector3(1,1,1).normalize());
    boxBody.quaternion.copy(quat);
    // boxBody.velocity.set(-30,0,Math.random()*20-10);
    // boxBody.angularVelocity.set(rand()*2-1, rand()*2-1, rand()*2-1);
    // boxBody.linearDamping = 0.3;
    // boxBody.angularDamping = 0.3;
    world.addBody(boxBody);
    bodies.push(boxBody);

    var cubeGeo = new THREE.BoxGeometry( 1, 1, 1, 1, 1 );
    let cubeMesh = new THREE.Mesh(cubeGeo, materials);
    cubeMesh.castShadow = true;
    cubeMesh.body = boxBody;
    meshes.push(cubeMesh);
    scene.add(cubeMesh);

    boxShape = new CANNON.Box(new CANNON.Vec3(0.5,0.5,0.5));
    boxBody = new CANNON.Body({ mass: mass, material: diceBodyMaterial });
    boxBody.addShape(boxShape);
    boxBody.position.set(0,2,0);
     quat = new THREE.Quaternion()
    .setFromUnitVectors(
        new THREE.Vector3(0,1,0),
        new THREE.Vector3(rand()*2-1, rand()*2-1, rand()*2-1).normalize());
        // new THREE.Vector3(1,1,1).normalize());
    boxBody.quaternion.copy(quat);
    // boxBody.velocity.set(-30,0,Math.random()*20-10);
    // boxBody.angularVelocity.set(rand()*2-1, rand()*2-1, rand()*2-1);
    // boxBody.linearDamping = 0.3;
    // boxBody.angularDamping = 0.3;
    world.addBody(boxBody);
    bodies.push(boxBody);

    cubeGeo = new THREE.BoxGeometry( 1, 1, 1, 1, 1 );
    cubeMesh = new THREE.Mesh(cubeGeo, materials);
    cubeMesh.castShadow = true;
    cubeMesh.body = boxBody;
    meshes.push(cubeMesh);
    scene.add(cubeMesh);
}

function removeAllPhysicsDice() {
    bodies.forEach((b) => world.removeBody(b));
    meshes.forEach((m) => scene.remove(m));
    bodies = [];
    meshes = [];
}

/*

*/

function test() {
    var resultsTable = [];
    var results = [];
    var count = 0;
    while (count < 10000) {

        results.push(Math.floor(Math.random()*6+1))
        results.push(Math.floor(Math.random()*6+1))
        
        for(let i = 0; i < results.length; i++) {
            if(!resultsTable[results[i]]) {
                resultsTable[results[i]] = 1;
            } else {
                resultsTable[results[i]] += 1;
            }
        }
        let sum = results[0] + results[1];
        if(!resultsTable["sum"+sum]) {
            resultsTable["sum"+sum] = 1;
        } else {
            resultsTable["sum"+sum] += 1;
        }

        results = []
        count++
    }
    console.log(resultsTable)
}


function roll() {
    setupRoll();
    throwTwoD6Dice();
    startResultCheckers(undefined, function(results) {
        for(let i = 0; i < results.length; i++) {
            if(!resultsTable[results[i]]) {
                resultsTable[results[i]] = 1;
            } else {
                resultsTable[results[i]] += 1;
            }
        }
        let sum = results[0] + results[1];
        if(!resultsTable["sum"+sum]) {
            resultsTable["sum"+sum] = 1;
        } else {
            resultsTable["sum"+sum] += 1;
        }
    });
}

setInterval(function() {
    roll();
}, 2000);

function setupRoll() {
    if(resultsDeadlineTimeout) {
        clearTimeout(resultsDeadlineTimeout)
    }
    if(stoppedCheckInterval) {
        clearInterval(stoppedCheckInterval)
    }
    removeAllPhysicsDice()
}

function startResultCheckers(resultsIntervalCallback, resultsFinalCallBack) {
    stoppedCheckInterval = setInterval(function() {
        let allStopped = true;
        for(let i = 0; i < bodies.length; i++) {
            allStopped = allStopped && bodies[i].velocity.lengthSquared() < EPSILON;
        }
        if(allStopped) {
            //DONE. Report results. End timeouts and intervals

            //report results
            let results = [];
            for(let i = 0; i < meshes.length; i++) {
                results.push(getDiceValue(meshes[i]));
                log(getDiceValue(meshes[i]));
            }
            if (resultsFinalCallBack) {
                resultsFinalCallBack(results);
            }
            clearInterval(stoppedCheckInterval)
            clearTimeout(resultsDeadlineTimeout)
        }
    }, 150);
    resultsDeadlineTimeout = setTimeout(function() {
        //Deadline passed. Report what ever the dice
        //read at this time and end the results check interval
        for(let i = 0; i < meshes.length; i++) {
            log(getDiceValue(meshes[i]));
        }
        clearInterval(stoppedCheckInterval)
    }, 4000);
}

function initInput() {
    window.addEventListener( 'keyup', function ( event ) {
        console.log(event.keyCode)
        switch ( event.keyCode ) {
            // Q
            case 81:
            roll();
                break;
            // A
            case 65:
                break;
            // Z
            case 90:
                removeAllPhysicsDice()
                break;
        }
    }, false );

    window.addEventListener( 'keyup', function () {}, false );
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;

    let w = camera.right - camera.left;
    let h = w * window.innerHeight / window.innerWidth;
    camera.left = w / - 2;
    camera.right = w / 2;
    camera.top = h / 2;
    camera.bottom = h / - 2;
    camera.updateProjectionMatrix();
    // controls.handleResize();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
    requestAnimationFrame( animate );

    // required if controls.enableDamping or controls.autoRotate are set to true
    if(enableControls) { controls.update(); }

    cannonDebugRenderer.update();
    updatePhysics();
    renderer.render(scene, camera);
}

function updatePhysics(){
    world.step(dt * 2.0);
    for(var i=0; i !== meshes.length; i++){
        meshes[i].position.copy(bodies[i].position);
        meshes[i].quaternion.copy(bodies[i].quaternion);

        let displayMesh = displayDiceMeshes[i];
        displayMesh.quaternion.copy(bodies[i].quaternion);
        displayMesh.position.set(displayMesh.position.x,bodies[i].position.y,displayMesh.position.z);
    }
}

//author: teal
function getDiceValue(diceMesh) {
    var vector = new THREE.Vector3(0, 1, 0);
    var closest_face, closest_angle = Math.PI * 2;
    for (var i = 0, l = diceMesh.geometry.faces.length; i < l; ++i) {
        var face = diceMesh.geometry.faces[i];
        // if (face.materialIndex == 0) continue;
        var angle = face.normal.clone().applyQuaternion(diceMesh.quaternion).angleTo(vector);

        if (angle < closest_angle) {
            closest_angle = angle;
            closest_face = face;
        }
    }
    var matindex = closest_face.materialIndex + 1;
    return matindex;
}

function addRampEntities() {
    function rad(deg) {return (deg/360)*Math.PI*2};
    function randAngle() {return Math.PI*2*Math.random();}

    let rampRotation = new THREE.Quaternion()
    .setFromUnitVectors(
        new THREE.Vector3(0,1,0),
        new THREE.Vector3(0.5,0,0).normalize());

    for(let u = 0; u < 10; u+=1) {
        for(let n = 0; n <= 2; n++) {
            let pos = new THREE.Vector3(u, 0, (n) - (2-0)/2);
            let quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(randAngle(),randAngle(),randAngle(), "YXZ"));
            let size = new THREE.Vector3(1,1,1);
            pos.applyQuaternion(rampRotation);
            pos.add(new THREE.Vector3(-2,7,0));
            createStaticEntity(pos,quat,size);
        }
    }            
}

function createStaticEntity(position, quaternion, size, invisible) {

    // Create boxes
    let halfSize = (new CANNON.Vec3(size.x,size.y,size.z)).scale(0.5);
    var boxShape = new CANNON.Box(new CANNON.Vec3(halfSize.x,halfSize.y,halfSize.z));
    var staticBody = new CANNON.Body({ mass: 0 });
    staticBody.addShape(boxShape);
    staticBody.position.set(position.x,position.y,position.z);
    staticBody.quaternion.set(quaternion.x,quaternion.y,quaternion.z,quaternion.w);
    world.addBody(staticBody);
    staticBodies.push(staticBody);

    if(!staticMaterial) {
        staticMaterial = new THREE.MeshPhongMaterial( { color: 0x88aa22} );
    }

    if(!invisible) {
        var cubeGeo = new THREE.BoxGeometry( size.x, size.y, size.z, 1, 1 );
        var boxMesh = new THREE.Mesh(cubeGeo, staticMaterial);
        boxMesh.castShadow = true;
        staticMeshes.push(boxMesh);

        boxMesh.position.copy(staticBody.position);
        boxMesh.quaternion.copy(staticBody.quaternion);

        scene.add(boxMesh);

        var axesHelper = new THREE.AxesHelper( 2 );
        axesHelper.position.copy(staticBody.position);
        axesHelper.quaternion.copy(staticBody.quaternion);
        // scene.add( axesHelper );

        var box = new THREE.BoxHelper( boxMesh, 0xffff00 );
        // scene.add( box );
    }

}


//----------------------------------------------------------------------------
//----------------------------------------------------------------------------
//----------------------------- T E A L --------------------------------------
//----------------------------------------------------------------------------
//----------------------------------------------------------------------------

//author: teal
function calc_texture_size(approx) {
    return Math.pow(2, Math.floor(Math.log(approx) / Math.log(2)));
}

//author: teal
function create_text_texture(text, color, back_color) {
    let margin = 0.5;
    let size = 15;
    if (text == undefined) return null;
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    var ts = calc_texture_size(size + size * 2 * margin) * 2;
    canvas.width = canvas.height = ts;
    context.font = ts / (1 + 2 * margin) + "pt Arial";
    context.fillStyle = back_color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = color;
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    if (text == '6' || text == '9') {
        context.fillText('  .', canvas.width / 2, canvas.height / 2);
    }
    var texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}


//author: teal
function create_d6_geometry(radius) {
    var vertices = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
            [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
    var faces = [[0, 3, 2, 1, 1], [1, 2, 6, 5, 2], [0, 1, 5, 4, 3],
            [3, 7, 6, 2, 4], [0, 4, 7, 3, 5], [4, 5, 6, 7, 6]];
    return create_geom(vertices, faces, radius, 0.1, Math.PI / 4, 0.96);
}

//author: teal
function create_d20_geometry(radius) {
    var t = (1 + Math.sqrt(5)) / 2;
    var vertices = [[-1, t, 0], [1, t, 0 ], [-1, -t, 0], [1, -t, 0],
            [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
            [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
    var faces = [[0, 11, 5, 1], [0, 5, 1, 2], [0, 1, 7, 3], [0, 7, 10, 4], [0, 10, 11, 5],
            [1, 5, 9, 6], [5, 11, 4, 7], [11, 10, 2, 8], [10, 7, 6, 9], [7, 1, 8, 10],
            [3, 9, 4, 11], [3, 4, 2, 12], [3, 2, 6, 13], [3, 6, 8, 14], [3, 8, 9, 15],
            [4, 9, 5, 16], [2, 4, 11, 17], [6, 2, 10, 18], [8, 6, 7, 19], [9, 8, 1, 20]];
    return create_geom(vertices, faces, radius, -0.2, -Math.PI / 4 / 2, 0.955);
}

//author: teal
function create_geom(vertices, faces, radius, tab, af, chamfer) {
    var vectors = new Array(vertices.length);
    for (var i = 0; i < vertices.length; ++i) {
        vectors[i] = (new THREE.Vector3).fromArray(vertices[i]).normalize();
    }
    var cg = chamfer_geom(vectors, faces, chamfer);
    var geom = make_geom(cg.vectors, cg.faces, radius, tab, af);
    // var geom = make_geom(vectors, faces, radius, tab, af); // Without chamfer
    geom.cannon_shape = create_shape(vectors, faces, radius);
    // geom.cannon_shape = create_shape(cg.vectors, cg.faces, radius); //Using chamfer geometry
    return geom;
}


//author: teal
function make_geom(vertices, faces, radius, tab, af) {
    var geom = new THREE.Geometry();
    for (var i = 0; i < vertices.length; ++i) {
        var vertex = vertices[i].multiplyScalar(radius);
        vertex.index = geom.vertices.push(vertex) - 1;
    }
    for (var i = 0; i < faces.length; ++i) {
        var ii = faces[i], fl = ii.length - 1;
        var aa = Math.PI * 2 / fl;
        for (var j = 0; j < fl - 2; ++j) {
            geom.faces.push(new THREE.Face3(
                ii[0], ii[j + 1], ii[j + 2], //vertices
                 [geom.vertices[ii[0]], geom.vertices[ii[j + 1]], geom.vertices[ii[j + 2]]], //normals
                 0, //color
                 ii[fl] + 1)); //material index
            geom.faceVertexUvs[0].push([                        
                    new THREE.Vector2((Math.cos(af) + 1 + tab) / 2 / (1 + tab),
                        (Math.sin(af) + 1 + tab) / 2 / (1 + tab)),
                    new THREE.Vector2((Math.cos(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab),
                        (Math.sin(aa * (j + 1) + af) + 1 + tab) / 2 / (1 + tab)),
                    new THREE.Vector2((Math.cos(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab),
                        (Math.sin(aa * (j + 2) + af) + 1 + tab) / 2 / (1 + tab))]);
        }
    }
    geom.computeFaceNormals();
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius);
    return geom;
}

//author: teal
//I don't completely understand what is happening here, but I noticed that if
//you want to add a material to this geometery, the first two will need to be
//"empty" ones. The rest will actually be for the "dice faces"
function chamfer_geom(vectors, faces, chamfer) {
    var chamfer_vectors = [], chamfer_faces = [], corner_faces = new Array(vectors.length);
    for (var i = 0; i < vectors.length; ++i) corner_faces[i] = [];
    for (var i = 0; i < faces.length; ++i) {
        var ii = faces[i], fl = ii.length - 1;
        var center_point = new THREE.Vector3();
        var face = new Array(fl);
        for (var j = 0; j < fl; ++j) {
            var vv = vectors[ii[j]].clone();
            center_point.add(vv);
            face[j] = chamfer_vectors.push(vv) - 1
            corner_faces[ii[j]].push(face[j]);
        }
        center_point.divideScalar(fl);
        for (var j = 0; j < fl; ++j) {
            var vv = chamfer_vectors[face[j]];
            vv.subVectors(vv, center_point).multiplyScalar(chamfer).addVectors(vv, center_point);
        }
        face.push(ii[fl]);
        chamfer_faces.push(face);
    }
    for (var i = 0; i < faces.length - 1; ++i) {
        for (var j = i + 1; j < faces.length; ++j) {
            var pairs = [], lastm = -1;
            for (var m = 0; m < faces[i].length - 1; ++m) {
                var n = faces[j].indexOf(faces[i][m]);
                if (n >= 0 && n < faces[j].length - 1) {
                    if (lastm >= 0 && m != lastm + 1) pairs.unshift([i, m], [j, n]);
                    else pairs.push([i, m], [j, n]);
                    lastm = m;
                }
            }
            if (pairs.length != 4) continue;
            chamfer_faces.push([chamfer_faces[pairs[0][0]][pairs[0][1]],
                    chamfer_faces[pairs[1][0]][pairs[1][1]],
                    chamfer_faces[pairs[3][0]][pairs[3][1]],
                    chamfer_faces[pairs[2][0]][pairs[2][1]], -1]);
        }
    }
    for (var i = 0; i < corner_faces.length; ++i) {
        var cf = corner_faces[i], face = [cf[0]], count = cf.length - 1;
        while (count) {
            for (var m = faces.length; m < chamfer_faces.length; ++m) {
                var index = chamfer_faces[m].indexOf(face[face.length - 1]);
                if (index >= 0 && index < 4) {
                    if (--index == -1) index = 3;
                    var next_vertex = chamfer_faces[m][index];
                    if (cf.indexOf(next_vertex) >= 0) {
                        face.push(next_vertex);
                        break;
                    }
                }
            }
            --count;
        }
        face.push(-1);
        chamfer_faces.push(face);
    }
    return { vectors: chamfer_vectors, faces: chamfer_faces };
}

//author: teal
function create_shape(vertices, faces, radius) {
    var cv = new Array(vertices.length), cf = new Array(faces.length);
    for (var i = 0; i < vertices.length; ++i) {
        var v = vertices[i];
        cv[i] = new CANNON.Vec3(v.x * radius, v.y * radius, v.z * radius);
    }
    for (var i = 0; i < faces.length; ++i) {
        cf[i] = faces[i].slice(0, faces[i].length - 1);
    }
    return new CANNON.ConvexPolyhedron(cv, cf);
}
