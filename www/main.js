document.addEventListener('DOMContentLoaded', function () {
    var frameCounter = 0;
    var clock, stats, physicsStats, container, renderer, scene, world, camera,
        hudCamera, hudScene, gameStatusCamera, gameStatusScene, canvas;
    var windowHalfX = window.innerWidth / 2;
    var windowHalfY = window.innerHeight / 2;
    var shapes = [];
    var gameState ="game over";  //init, playing, game over, finished
    var gameOverMesh;
    var wallData = {
        walls: {
            ceiling: {mesh: undefined, body: undefined},
            rightWall: {mesh: undefined, body: undefined},
            leftWall: {mesh: undefined, body: undefined}
        },
        topOffset: 2,
        thickness: 1,
        ceilingWidth: undefined,
        color: 0x7777ee
    };
    var controls = {
        leftBackgroundMesh: undefined,
        rightBackgroundMesh: undefined,
        buttons: {
            left: {mesh: undefined},
            right: {mesh: undefined},
            leftUp: {mesh: undefined},
            rightUp: {mesh: undefined}
        },
        backgroundColor: (0xFFFFFF),
        unpressedColor: {r:222/255, g:0/255, b:255/255},
        pressedColor : {r:255/255, g:0/255, b:125/255},
        upUnpressedColor: {r:222/255, g:0/255, b:255/255},
        upPressedColor : {r:255/255, g:0/255, b:125/255},
        leftButtonPressed: false,
        rightButtonPressed: false,
        bolUpButtonPressed: false,
        tweenSpeed: 150
    };
    var width, height;
    var boxWidth, boxHeight, boxDepth;
    var numBoxesWide = 10;
    var timeStep = 1 / 60;
    var timeSinceLastBlock;

    //setup options
    var usePerspective = true;

    init();

    function init() {
        setupOptions();
        setupContainer();
        setupRenderer();

        scene = new THREE.Scene();
        hudScene = new THREE.Scene();
        gameStatusScene = new THREE.Scene();

        world = new CANNON.World();
        world.gravity.set(0, 10, 0);
        world.broadphase = new CANNON.NaiveBroadphase();
        ShapeProto.world = world;
        setupCamera();
        setupHUDCamera();
        setupGameStatusCamera();
        setupStats();
        setupWalls();
        setupControls();
        setupLights();
        addEventListeners();

        clock = new THREE.Clock();
        //start the animation loop

        addEventListeners();
        createGameOverSign();

        gameState = "playing";
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
        wallData.ceilingWidth=numBoxesWide*boxWidth;
    }

    //setup container
    function setupContainer() {
        container = document.createElement("div");
        document.body.appendChild(container);
    }

    function setupRenderer() {
        //renderer = new THREE.WebGLRenderer( { antialias: true, devicePixelRatio: 1 } );
        renderer = new THREE.WebGLRenderer({antialias: false, devicePixelRatio: 1});
        renderer.autoClearColor = false;
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMapEnabled = true;
        renderer.shadowMapSoft = true;
        renderer.shadowMapType = THREE.PCFShadowMap;
        canvas = renderer.domElement;
        canvas.id = "canvas";

        container.appendChild(canvas);
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
        width = .75 * height * aspectRatio;

        //console.log("width | height : " + width + " | " + height);
        //boxWidth = boxHeight = boxDepth = width / numBoxesWide;
        //console.log("width / numBoxesWide " + width / numBoxesWide);
        //console.log("box dim: " + boxWidth + ", " + boxHeight + ", " + boxDepth);

        scene.add(camera);
    }

    function setupHUDCamera() {
        hudCamera = new THREE.OrthographicCamera(
            width / -2, width / 2, height / 2, height / -2, -100, 1000);
        hudScene.add(hudCamera);
    }

    function setupGameStatusCamera() {
        gameStatusCamera = new THREE.OrthographicCamera(
            width / -2, width / 2, height / 2, height / -2, -100, 1000);
        gameStatusScene.add(gameStatusCamera);
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
        container.appendChild(physicsStats.domElement);
    }

    function animate() {
        var dt = clock.getDelta();

        if(gameState === "playing") {
            timeSinceLastBlock += dt;
            //only create a new shape if the first one has reached .25 of the screen

            if (ShapeProto.bolReadyForNextShape) {
                createFallingShape();
                timeSinceLastBlock = 0;
            }

            //loop through the shapes and update
            for (var key in ShapeProto.shapes) {
                if (ShapeProto.shapes.hasOwnProperty(key)) {
                    var shape = ShapeProto.shapes[key];
                    var state = shape.update(dt);
                    if(state === "game over"){
                        gameState = "game over";
                    }
                }
            }
            world.step(timeStep);
            //setTimeout(ShapeProto.removeDeadBlocks(numBoxesWide, fieldArray, scene), 1000);
            ShapeProto.removeDeadBlocks(scene, world); //
            //ShapeProto.setAllBlocksToUnevaluated(numBoxesWide);

        }


        render();
        requestAnimationFrame(animate);


    }

    function render() {



        TWEEN.update();
        renderer.render(scene, camera);
        renderer.render(hudScene, hudCamera);
        if(gameState === "game over"){
            renderer.render (gameStatusScene, gameStatusCamera)
        }
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

        var hudAmbientLight = new THREE.AmbientLight(0x404040); // soft white light
        var hudDirectionalLight = new THREE.DirectionalLight( 0xbbbbbb, 1, 100 );
        hudDirectionalLight.position.set( 0, 2, 10 );
        hudDirectionalLight.castShadow = true;
        hudDirectionalLight.shadowMapWidth = 2048;
        hudDirectionalLight.shadowMapHeight = 2048;
        hudDirectionalLight.shadowDarkness = 0.5;
        hudDirectionalLight.shadowCameraNear = 5;
        hudDirectionalLight.shadowCameraFar = 100;
        //light.shadowBias = 0.00001;
        // If this is too low, expect bright lines around objects
        hudDirectionalLight.shadowBias = 0.0015;
        // This rectangle is the only place you will get shadows
        hudDirectionalLight.shadowCameraRight =  20;
        hudDirectionalLight.shadowCameraLeft = -20;
        hudDirectionalLight.shadowCameraTop =  20;
        hudDirectionalLight.shadowCameraBottom = -20;

        hudScene.add(hudAmbientLight);
        hudScene.add(hudDirectionalLight);

        var statusAmbientLight = new THREE.AmbientLight(0xaaaaaa);
        var statusDirectionalLight = new THREE.DirectionalLight( 0xbbbbbb, 1, 100 );
        statusDirectionalLight.position.set( 0, 2, 10 );
        statusDirectionalLight.castShadow = true;
        statusDirectionalLight.shadowMapWidth = 2048;
        statusDirectionalLight.shadowMapHeight = 2048;
        statusDirectionalLight.shadowDarkness = 0.5;
        statusDirectionalLight.shadowCameraNear = 5;
        statusDirectionalLight.shadowCameraFar = 100;
        //light.shadowBias = 0.00001;
        // If this is too low, expect bright lines around objects
        statusDirectionalLight.shadowBias = 0.0015;
        // This rectangle is the only place you will get shadows
        statusDirectionalLight.shadowCameraRight =  20;
        statusDirectionalLight.shadowCameraLeft = -20;
        statusDirectionalLight.shadowCameraTop =  20;
        statusDirectionalLight.shadowCameraBottom = -20;

        gameStatusScene.add(statusAmbientLight);
        gameStatusScene.add(statusDirectionalLight);
    }



    function setupWalls() {

        var wallMaterial = new THREE.MeshPhongMaterial({color: wallData.color});

        wallData.walls.ceiling.mesh = new THREE.Mesh(new THREE.BoxGeometry(wallData.ceilingWidth,
                wallData.thickness,  wallData.thickness),
            wallMaterial);
        wallData.walls.ceiling.mesh.name = "ceiling";

        wallData.walls.rightWall.mesh = new THREE.Mesh(new THREE.BoxGeometry( wallData.thickness,
                height, wallData.thickness),
            wallMaterial);
        wallData.walls.rightWall.mesh.name = "rightWall";

        wallData.walls.leftWall.mesh = new THREE.Mesh(new THREE.BoxGeometry(wallData.thickness,
                height, wallData.thickness),
            wallMaterial);
        wallData.walls.leftWall.mesh.name = "leftWall";


        scene.add(wallData.walls.ceiling.mesh);
        scene.add(wallData.walls.leftWall.mesh);
        scene.add(wallData.walls.rightWall.mesh);

        // Create a slippery material (friction coefficient = 0.0)
        var slipperyMaterial = new CANNON.Material("slipperyMaterial");
        // The ContactMaterial defines what happens when two materials meet.
        // In this case we want friction coefficient = 0.0 when the slippery material touches ground.
        var boxMaterial = new CANNON.Material("boxMaterial");
        var slipperyWallContactMaterial = new CANNON.ContactMaterial(boxMaterial, slipperyMaterial, {
            friction: 0
        });
        // We must add the contact materials to the world
        world.addContactMaterial(slipperyWallContactMaterial);

        //create the physics bodies for the wallData
        //loop through the shapes and update
        for (var key in wallData.walls) {
            if (wallData.walls.hasOwnProperty(key)) {
                var wall = wallData.walls[key];
                wall.body = CannonHelper.createStaticBox(wall.mesh);
                wall.body.material = slipperyWallContactMaterial;
                world.add(wall.body);
            }
        }
        wallData.walls.ceiling.body.position.y = height / 2 - wallData.thickness/2 - wallData.topOffset;

        wallData.walls.leftWall.body.position.x = wallData.walls.ceiling.body.position.x
            -(wallData.ceilingWidth / 2) - wallData.thickness/2;
        wallData.walls.rightWall.body.position.x = wallData.walls.ceiling.body.position.x
            +(wallData.ceilingWidth / 2) + wallData.thickness/2;

        wallData.walls.leftWall.body.position.y -= wallData.topOffset;
        wallData.walls.rightWall.body.position.y -= wallData.topOffset;

        wallData.walls.ceiling.mesh.position.copy(wallData.walls.ceiling.body.position);
        wallData.walls.ceiling.mesh.quaternion.copy(wallData.walls.ceiling.body.quaternion);

        wallData.walls.rightWall.mesh.position.copy(wallData.walls.rightWall.body.position);
        wallData.walls.rightWall.mesh.quaternion.copy(wallData.walls.rightWall.body.quaternion);

        wallData.walls.leftWall.mesh.position.copy(wallData.walls.leftWall.body.position);
        wallData.walls.leftWall.mesh.quaternion.copy(wallData.walls.leftWall.body.quaternion);
    }

    function setupControls() {
        var backgroundRad = wallData.ceilingWidth * .25;
        var buttonRad =1;
        var buttonOffSet = {x:.85, y:.25, z:1.1};
        var upButtonOffSet = {x:.65, y:.60, z:1.1};
        //var sideMovementButtonAngle = 25

        var color = new THREE.Color().setRGB(
            controls.unpressedColor.r,
            controls.unpressedColor.g,
            controls.unpressedColor.b
        );
        var upUnpressedColor = new THREE.Color().setRGB(
            controls.upUnpressedColor.r,
            controls.upUnpressedColor.g,
            controls.upUnpressedColor.b
        );
        var backgroundMat = new THREE.MeshPhongMaterial({color:controls.backgroundColor});


        controls.leftBackgroundMesh = new THREE.Mesh(new THREE.CircleGeometry(backgroundRad, 40),
            backgroundMat);

        controls.rightBackgroundMesh = new THREE.Mesh(new THREE.CircleGeometry(backgroundRad, 40),
            backgroundMat);

        controls.rightBackgroundMesh.position.x = wallData.walls.rightWall.mesh.position.x-2;
        controls.leftBackgroundMesh.position.x = wallData.walls.leftWall.mesh.position.x+2;

        controls.rightBackgroundMesh.position.y = -height/2.5;
        controls.leftBackgroundMesh.position.y = -height/2.5;

        var leftButMat = new THREE.MeshPhongMaterial({color: color});
        var rightButMat = new THREE.MeshPhongMaterial({color: color});
        var upButMat = new THREE.MeshPhongMaterial({color: upUnpressedColor});

        controls.buttons.right.mesh = new THREE.Mesh(new THREE.SphereGeometry(buttonRad, 32, 32),
            rightButMat);
        controls.buttons.left.mesh = new THREE.Mesh(new THREE.SphereGeometry(buttonRad, 32, 32),
            leftButMat);

        controls.buttons.leftUp.mesh = new THREE.Mesh(new THREE.SphereGeometry(buttonRad, 32, 32),
            upButMat);
        controls.buttons.rightUp.mesh = new THREE.Mesh(new THREE.SphereGeometry(buttonRad, 32, 32),
            upButMat);

        //controls.buttons.left.mesh.position.copy(leftBackgroundMesh.position);
        //controls.buttons.right.mesh.position.copy(rightBackgroundMesh.position);
        //controls.buttons.leftUp.mesh.position.copy(leftBackgroundMesh.position);
        //controls.buttons.rightUp.mesh.position.copy(rightBackgroundMesh.position);

        controls.buttons.left.mesh.position.x +=  backgroundRad - 1; //wallData.leftWall.mesh.position.x + horOffset;
        controls.buttons.right.mesh.position.x -=  backgroundRad - 1; //wallData.rightWall.mesh.position.x - horOffset;
        //controls.buttons.right.mesh.position.y +=  backgroundRad *buttonOffSet.y;
        //controls.buttons.left.mesh.position.y +=  backgroundRad *buttonOffSet.y;
        controls.buttons.right.mesh.position.z += backgroundRad * buttonOffSet.z;
        controls.buttons.left.mesh.position.z += backgroundRad * buttonOffSet.z;
        controls.buttons.left.mesh.name = "leftButton";
        controls.buttons.right.mesh.name = "rightButton";
        //
        //controls.buttons.leftUp.mesh.position.x +=  backgroundRad *upButtonOffSet.x; //wallData.leftWall.mesh.position.x + horOffset;
        //controls.buttons.rightUp.mesh.position.x -=  backgroundRad *upButtonOffSet.x; //wallData.rightWall.mesh.position.x - horOffset;
        controls.buttons.rightUp.mesh.position.y +=  backgroundRad-1;
        controls.buttons.leftUp.mesh.position.y +=  backgroundRad-1;
        controls.buttons.rightUp.mesh.position.z += backgroundRad * upButtonOffSet.z;
        controls.buttons.leftUp.mesh.position.z += backgroundRad * upButtonOffSet.z;
        controls.buttons.leftUp.mesh.name = "leftUp";
        controls.buttons.rightUp.mesh.name = "rightUp";


        controls.leftBackgroundMesh.add(controls.buttons.leftUp.mesh);
        controls.leftBackgroundMesh.add(controls.buttons.left.mesh);

        controls.rightBackgroundMesh.add(controls.buttons.rightUp.mesh);
        controls.rightBackgroundMesh.add(controls.buttons.right.mesh);

        controls.buttons.leftUp.mesh.castShadow = true;
        controls.buttons.left.mesh.castShadow = true;
        controls.buttons.rightUp.mesh.castShadow = true;
        controls.buttons.right.mesh.castShadow = true;

        controls.leftBackgroundMesh.receiveShadow = true;
        controls.rightBackgroundMesh.receiveShadow = true;

        hudScene.add(controls.leftBackgroundMesh);
        hudScene.add(controls.rightBackgroundMesh);

    }

    function directionButtonPressed(button){
        var tweenSpeed = 150;

        var origin = controls.unpressedColor;
        var target = {r : controls.pressedColor.r,
            g: controls.pressedColor.g,
            b : controls.pressedColor.b};

        var upButOrigin = controls.upUnpressedColor;
        var upButTarget = {r : controls.upPressedColor.r,
            g: controls.upPressedColor.g,
            b : controls.upPressedColor.b};
        var colorTween = new TWEEN.Tween(origin).to(target, tweenSpeed)
            .easing(TWEEN.Easing.Quartic.In)
            .repeat( 1 )
            .delay( 0 )
            .yoyo( true )
            .easing( TWEEN.Easing.Cubic.InOut )
            .onUpdate(
                function(){
                    var color = new THREE.Color().setRGB(
                        origin.r,
                        origin.g,
                        origin.b
                    );
                    switch (button) {
                        case "leftButton":
                                controls.buttons.left.mesh.material.color = color;
                            break;
                        case "rightButton":
                                controls.buttons.right.mesh.material.color = color;
                            break;
                        case "up":
                            controls.buttons.rightUp.mesh.material.color = color;
                            break;
                    }
                });
        colorTween.start();
        var originScale = new THREE.Vector3(1, 1, 1);
        var targetScale = new THREE.Vector3(.75,.75, .75);
        var sizeTween = new TWEEN.Tween(originScale).to(targetScale, tweenSpeed)
            .easing(TWEEN.Easing.Quartic.In)
            .repeat( 1 )
            .delay( 0 )
            .yoyo( true )
            .easing( TWEEN.Easing.Cubic.InOut )
            .onUpdate(
            function(){
                switch (button) {
                    case "leftButton":
                        controls.buttons.left.mesh.scale.copy(originScale);
                        break;
                    case "rightButton":
                        controls.buttons.right.mesh.scale.copy(originScale);
                        break;
                }
            });
        sizeTween.start();
    }

    function tweenUpButtonDown(){
        var tweenSpeed = controls.tweenSpeed;

        var origin = controls.upUnpressedColor;
        var target = {r : controls.upPressedColor.r,
            g: controls.upPressedColor.g,
            b : controls.upPressedColor.b};
        var colorTween = new TWEEN.Tween(origin).to(target, tweenSpeed)
            .easing(TWEEN.Easing.Quartic.In)
            .delay( 0 )
            .easing( TWEEN.Easing.Cubic.InOut )
            .onUpdate(
            function(){
                var color = new THREE.Color().setRGB(
                    origin.r,
                    origin.g,
                    origin.b
                );
                controls.buttons.rightUp.mesh.material.color = color;
                controls.buttons.leftUp.mesh.material.color = color;

            });
        colorTween.start();
        var originScale = new THREE.Vector3(
            controls.buttons.rightUp.mesh.scale.x,
            controls.buttons.rightUp.mesh.scale.y,
            controls.buttons.rightUp.mesh.scale.z
        );
        var targetScale = new THREE.Vector3(
            .75,
            .75,
            .75);
        var sizeTween = new TWEEN.Tween(originScale).to(targetScale, tweenSpeed)
            .easing(TWEEN.Easing.Quartic.In)
            .delay( 0 )
            .easing( TWEEN.Easing.Cubic.InOut )
            .onUpdate(
            function(){
                controls.buttons.rightUp.mesh.scale.copy(originScale);
                controls.buttons.leftUp.mesh.scale.copy(originScale);

            });
        sizeTween.start();
    }

    function tweenUpButtonUp(){
        var tweenSpeed = 150;

        var origin = controls.upPressedColor;
        var target = {r : controls.upUnpressedColor.r,
            g: controls.upUnpressedColor.g,
            b : controls.upUnpressedColor.b};
        var colorTween = new TWEEN.Tween(origin).to(target, tweenSpeed)
            .easing(TWEEN.Easing.Quartic.In)
            .delay( 0 )
            .easing( TWEEN.Easing.Cubic.InOut )
            .onUpdate(
            function(){
                var color = new THREE.Color().setRGB(
                    origin.r,
                    origin.g,
                    origin.b
                );
                controls.buttons.rightUp.mesh.material.color = color;
                controls.buttons.leftUp.mesh.material.color = color;
            });

        colorTween.start();
        var originScale = new THREE.Vector3(
            controls.buttons.rightUp.mesh.scale.x,
            controls.buttons.rightUp.mesh.scale.y,
            controls.buttons.rightUp.mesh.scale.z
        );
        var targetScale = new THREE.Vector3(1,1, 1);
        var sizeTween = new TWEEN.Tween(originScale).to(targetScale, tweenSpeed)
            .easing(TWEEN.Easing.Quartic.In)
            .delay( 0 )
            .easing( TWEEN.Easing.Cubic.InOut )
            .onUpdate(
            function(){
                controls.buttons.rightUp.mesh.scale.copy(originScale);
                controls.buttons.leftUp.mesh.scale.copy(originScale);

            });
        sizeTween.start();
    }

    function mouseClick() {
        var raycaster = new THREE.Raycaster(); // create once
        var mouse = new THREE.Vector2(); // create once


        mouse.x = ( event.clientX / renderer.domElement.width ) * 2 - 1;
        mouse.y = - ( event.clientY / renderer.domElement.height ) * 2 + 1;

        raycaster.setFromCamera( mouse, hudCamera );

        var intersectionObjects = controls.leftBackgroundMesh.children.concat(controls.rightBackgroundMesh.children);
        var intersectionArray = raycaster.intersectObjects( intersectionObjects);

        for (var i = 0; i < intersectionArray.length; i++) {
            if (intersectionArray[i].object) {
                switch (intersectionArray[i].object.name) {
                    case "leftButton":
                        directionButtonPressed("leftButton");
                        ShapeProto.setShapeMovement("left");
                        break;
                    case "rightButton":
                        directionButtonPressed("rightButton");
                        ShapeProto.setShapeMovement("right");
                        break;
                }
            }
        }
    }

    function mouseDown(event) {
        var mouse = new THREE.Vector2(); // create once

        mouse.x = ( event.clientX / renderer.domElement.width ) * 2 - 1;
        mouse.y = - ( event.clientY / renderer.domElement.height ) * 2 + 1;
        canvasDown(mouse);
    }

    function touchStart(event){
        var touch = new THREE.Vector2(); // create once

        touch.x = ( event.changedTouches[0].clientX / renderer.domElement.width ) * 2 - 1;
        touch.y = - ( event.changedTouches[0].clientY / renderer.domElement.height ) * 2 + 1;
        canvasDown(touch);
    }

    function canvasDown(vector2){

        var raycaster = new THREE.Raycaster(); // create once
        raycaster.setFromCamera( vector2, hudCamera );

        var intersectionObjects = controls.leftBackgroundMesh.children.concat(controls.rightBackgroundMesh.children);
        var intersectionArray = raycaster.intersectObjects( intersectionObjects);

        for (var i = 0; i < intersectionArray.length; i++) {
            if (intersectionArray[i].object) {
                switch (intersectionArray[i].object.name) {
                    case "leftUp":
                    case "rightUp":
                        console.log('down');
                        tweenUpButtonDown();
                        ShapeProto.bolUpButtonPressed = true;
                        break;
                }
            }
        }
    }

    function mouseUp() {
        var mouse = new THREE.Vector2(); // create once

        mouse.x = ( event.clientX / renderer.domElement.width ) * 2 - 1;
        mouse.y = - ( event.clientY / renderer.domElement.height ) * 2 + 1;
        canvasUp(mouse);

    }

    function touchEnd(){
        var touch = new THREE.Vector2(); // create once
        touch.x = ( event.changedTouches[0].clientX / renderer.domElement.width ) * 2 - 1;
        touch.y = - ( event.changedTouches[0].clientY / renderer.domElement.height ) * 2 + 1;
        canvasUp(touch)
    }

    /*****************
     * called for touchend and mouseup events
     */
    function canvasUp(vector){
        var raycaster = new THREE.Raycaster(); // create once
        raycaster.setFromCamera( vector, hudCamera );

        var intersectionObjects = controls.leftBackgroundMesh.children.concat(controls.rightBackgroundMesh.children);
        var intersectionArray = raycaster.intersectObjects( intersectionObjects);

        for (var i = 0; i < intersectionArray.length; i++) {
            if (intersectionArray[i].object) {
                switch (intersectionArray[i].object.name) {
                    case "leftUp":
                    case "rightUp":
                        console.log('up');
                        tweenUpButtonUp();
                        ShapeProto.bolUpButtonPressed = false;
                        break;
                }
            }
        }
    }



    function addEventListeners() {
        canvas.addEventListener('click', mouseClick, false);
        canvas.addEventListener('mousedown', mouseDown, false);
        canvas.addEventListener('mouseup', mouseUp, false);
        canvas.addEventListener('mouseup', mouseUp, false);
        window.addEventListener('resize', onWindowResize, false);
        canvas.addEventListener('touchstart', touchStart, false);
        canvas.addEventListener('touchend', touchEnd, false);
    }


    function createFallingShape() {
        var shape = new Shape(scene, world, boxWidth, boxHeight, boxDepth, gameState, numBoxesWide, wallData);
        //add the shape to the prototype's list of shapes
        ShapeProto.shapes[shape.shapeID] = shape;
        shapes.push(shape);
    }

    function createGameOverSign(){
        //var makeGameOverCanvas = function() {
        //    var size = 257;
        //    var textureCanvas = document.createElement('canvas');
        //
        //    textureCanvas.width = textureCanvas = size;
        //    var context = textureCanvas.getContext('2d');
        //    context.font = '100pt Arial';
        //    context.fillStyle = "green";
        //    context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
        //    context.fillStyle = 'white';
        //    context.fillRect(20, 20, textureCanvas.width - 40, textureCanvas.height - 40);
        //    context.fillStyle = 'black';
        //    context.textAlign = "center";
        //    context.textBaseline = "middle";
        //    context.fillText("Game Over", textureCanvas.width / 2, textureCanvas.height / 2);
        //
        //    return textureCanvas;
        //};
        //
        //
        //var tex = new THREE.Texture(makeGameOverCanvas);
        //tex.minFilter = THREE.LinearFilter;
        //tex.needsUpdate = true;
        //
        ////var geometry = new THREE.PlaneGeometry( 1, 1, 1);
        //var geometry = new THREE.BoxGeometry( 1, 1, 1);
        ////var mat = new THREE.MeshBasicMaterial({ color:0xffffff, side:THREE.DoubleSide });
        //var mat = new THREE.MeshBasicMaterial( {map: tex, side:THREE.DoubleSide } );
        //
        //gameOverMesh = new THREE.Mesh(geometry, mat);
        //gameOverMesh.position.z = 10;

        var backGeo = new THREE.PlaneGeometry( wallData.ceilingWidth, 2, 1, 1);
        var backMat = new THREE.MeshLambertMaterial({color: 0xffffff});
        var backMesh = new THREE.Mesh(backGeo, backMat);

        var wordsGeo = new THREE.TextGeometry("Game Over", {size: 1,
            height:1,
            curveSegments: 10,
            weight: "normal",
            style: "normal",
            font: 'helvetiker'});
        var wordsMat = new THREE.MeshLambertMaterial({color: 0x003300});
        var words = new THREE.Mesh(wordsGeo, wordsMat);
        wordsGeo.computeBoundingBox();
        words.castShadow = true;

        words.position.x = backMesh.geometry.parameters.width/2 - words.geometry.boundingBox.max.x/2 - backMesh.geometry.parameters.width/2;
        words.position.y = backMesh.geometry.parameters.height/2 - words.geometry.boundingBox.max.y/2 - backMesh.geometry.parameters.height/2;

        backMesh.add(words);
        backMesh.receiveShadow = true;
        gameStatusScene.add(backMesh);
    }

});