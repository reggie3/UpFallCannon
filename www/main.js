document.addEventListener('DOMContentLoaded', function () {
    var frameCounter = 0;
    var clock, stats, physicsStats, container, renderer, scene, world, camera, overlay;
    var windowHalfX = window.innerWidth / 2;
    var windowHalfY = window.innerHeight / 2;
    var bolReadyForNewShape = true;
    var shapes = [];
    var walls = {
         ceiling :{mesh: undefined, body: undefined},
        rightWall : {mesh: undefined, body: undefined},
        leftWall : {mesh: undefined, body: undefined}
    };
    var width, height;
    var boxWidth, boxHeight, boxDepth;
    var numBoxesWide = 12;
    var fieldArray = [];
    var matchedObjects;
    var timeStep = 1/60;
    var blockInterval = 5;
    var timeSinceLastBlock;

    //setup options
    var usePerspective = true;

    init();


    function init() {
        setupOptions();
        setupContainer();
        setupRenderer();

        scene=new THREE.Scene();
        world = new CANNON.World();
        world.gravity.set(0, 5, 0);
        world.broadphase = new CANNON.NaiveBroadphase();

        setupCamera();
        setupStats();
        setupLights();
        addEventListeners();

        clock = new THREE.Clock();
        //start the animation loop
        setupWalls();
        animate();
    }

    function setupOptions() {
        //setup the options
        if (usePerspective === true) {
            boxWidth = 1;
            boxHeight = 1;
            boxDepth = 1;
        }
        else {
            boxWidth = width / 10;
            boxHeight = width / 10;
            boxDepth = width / 10;
        }
    }

    //setup container
    function setupContainer() {
        container = document.createElement("div");
        document.body.appendChild(container);
    }

    function setupRenderer() {
        //renderer = new THREE.WebGLRenderer( { antialias: true, devicePixelRatio: 1 } );
        renderer = new THREE.WebGLRenderer({ antialias: false, devicePixelRatio: 1 });

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMapEnabled = true;
        renderer.shadowMapSoft = true;
        renderer.shadowMapType = THREE.PCFShadowMap;
        container.appendChild(renderer.domElement);
    }

    function setupCamera() {
        //camera = new THREE.OrthographicCamera(
        //      width / -2, width / 2, height / 2, height / -2, -100, 1000);
        var aspectRatio = window.innerWidth / window.innerHeight;
        camera = new THREE.PerspectiveCamera(
            80, aspectRatio, 1, 1000);
        camera.position.set(0, 0, 15);
        //camera.lookAt( scene.position );

        var vFOV = camera.fov * Math.PI / 180;        // convert vertical fov to radians
        height = 2 * Math.tan(vFOV / 2) * camera.position.z; // visible height
        width = height * aspectRatio;

        //console.log("width | height : " + width + " | " + height);
        //boxWidth = boxHeight = boxDepth = width / numBoxesWide;
        //console.log("width / numBoxesWide " + width / numBoxesWide);
        //console.log("box dim: " + boxWidth + ", " + boxHeight + ", " + boxDepth);

        scene.add(camera);
    }

    function setupStats() {
        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.bottom = '0px';
        container.appendChild(stats.domElement);

        physicsStats = new Stats();
        physicsStats.domElement.style.position = 'absolute';
        physicsStats.domElement.style.bottom = '50px';
        physicsStats.domElement.style.zIndex = 100;
        container.appendChild( physicsStats.domElement );
    }

    function animate() {
        var dt = clock.getDelta();

        timeSinceLastBlock += dt;
        //only create a new shape if the first one has reached .25 of the screen
        if((!timeSinceLastBlock)||(timeSinceLastBlock>blockInterval)){

                createFallingShape();
                timeSinceLastBlock=0;

        }




        //loop through the shapes and update
        for (var key in ShapeProto.shapes) {
            if (ShapeProto.shapes.hasOwnProperty(key)) {
                var shape = ShapeProto.shapes[key];
                shape.update();
            }
        }

        render();

        world.step(timeStep);
        //setTimeout(ShapeProto.removeDeadBlocks(numBoxesWide, fieldArray, scene), 1000);
        ShapeProto.removeDeadBlocks(scene, world); //
        //ShapeProto.setAllBlocksToUnevaluated(numBoxesWide);
        requestAnimationFrame(animate);
    }

    function render() {
        renderer.render(scene, camera);
        stats.update();
        frameCounter++;
    }

    function onWindowResize() {
        windowHalfX = window.innerWidth / 2;
        windowHalfY = window.innerHeight / 2;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function setupLights() {
        var ambientLight = new THREE.AmbientLight(0x404040); // soft white light
        scene.add(ambientLight);

        var pointLight = new THREE.PointLight(0xff0000, 1, 100);
        pointLight.position.set(0, 0, 20);
        scene.add(pointLight);

        var dirLight = new THREE.DirectionalLight(0xffffff);
        // add shadow properties to light
        dirLight.castShadow = true;
        dirLight.shadowMapWidth = 2048;
        dirLight.shadowMapHeight = 2048;
        dirLight.shadowDarkness = 0.5;
        dirLight.shadowCameraNear = 5;
        dirLight.shadowCameraFar = 100;
        //light.shadowBias = 0.00001;
        // If this is too low, expect bright lines around objects
        dirLight.shadowBias = 0.0015;
        // This rectangle is the only place you will get shadows
        dirLight.shadowCameraRight = 20;
        dirLight.shadowCameraLeft = -20;
        dirLight.shadowCameraTop = 20;
        dirLight.shadowCameraBottom = -20;
        // For debugging
        //light.shadowCameraVisible = true;
        dirLight.position.set(15, 15, 20);
        scene.add(dirLight);
    }

    function addEventListeners() {
        // Generic setup
        window.addEventListener('resize', onWindowResize, false);
    }

    function setupWalls() {
        var wallMaterial = new THREE.MeshPhongMaterial({ color: 0x11ff00 });

        walls.ceiling.mesh = new THREE.Mesh( new THREE.BoxGeometry(width, 1, 100),
            wallMaterial);


        walls.rightWall.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, height, 1),
            wallMaterial)


        walls.leftWall.mesh = new THREE.Mesh( new THREE.BoxGeometry(1, height, 1),
            wallMaterial);



        scene.add(walls.ceiling.mesh);
        scene.add(walls.leftWall.mesh);
        scene.add(walls.rightWall.mesh)

        //create the physics bodies for the walls
        //loop through the shapes and update
        for (var key in walls) {
            if (walls.hasOwnProperty(key)) {
                var wall = walls[key];
                wall.body = CannonHelper.createStaticBox(wall.mesh);
                world.add(wall.body);

            }
        }
        walls.ceiling.body.position.y = height / 2;
        walls.rightWall.body.position.x = width / 2 - .5;
        walls.leftWall.body.position.x = width / -2 - .5;

        walls.ceiling.mesh.position.copy(walls.ceiling.body.position);
        walls.ceiling.mesh.quaternion.copy(walls.ceiling.body.quaternion);

        walls.rightWall.mesh.position.copy(walls.rightWall.body.position);
        walls.rightWall.mesh.quaternion.copy(walls.rightWall.body.quaternion);

        walls.leftWall.mesh.position.copy(walls.leftWall.body.position);
        walls.leftWall.mesh.quaternion.copy(walls.leftWall.body.quaternion);

    }

    function createFallingShape() {
        var shape = new Shape(scene, world, boxWidth, boxHeight, boxDepth, height, numBoxesWide, walls);
        //add the shape to the prototype's list of shapes
        ShapeProto.shapes[shape.shapeID] = shape;
        shapes.push(shape);
    }

});