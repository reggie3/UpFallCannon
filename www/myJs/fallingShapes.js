
var startingY = -14;
var boxMass = 1000;
var boxRestitution = .2;
var useNumberTexture = false;   //display shape ID's on the blocks
var numBlocksToMatch = 3;


//create a random box in a random location
function Shape(scene, world, boxWidth, boxHeight, boxDepth, gameState, numBoxesWide, wallData) {

    //numBoxesWide = 3;
    this.scene = scene;
    this.boxHeight = boxHeight;
    this.numBoxesWide = numBoxesWide;
    ShapeProto.wallData = wallData;

    this.shapeID = this.currentID;
    ShapeProto.currentID++;

    //determine the color
    var colorIndex = getRandBetween(0, ShapeProto.boxColors.length - 1);
    this.shapeColor = ShapeProto.colors[colorIndex];
    // Box

    var mat;
    if(useNumberTexture){
        var tex = new THREE.Texture(this.canvasTexture(this.shapeID, this.colors[colorIndex]));
        tex.minFilter = THREE.LinearFilter;
        tex.needsUpdate = true;

        mat = new THREE.MeshBasicMaterial( {map: tex, side:THREE.DoubleSide } );
    }
    else{
        mat = new THREE.MeshLambertMaterial({
            color: this.boxColors[colorIndex]
        });
    }
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth), mat);
    this.columnNumber = Math.floor(Math.random() * (this.numBoxesWide));

    // Create a slippery material (friction coefficient = 0.0)
    var slipperyMaterial = new CANNON.Material("slipperyMaterial");
    // The ContactMaterial defines what happens when two materials meet.
    // In this case we want friction coefficient = 0.0 when the slippery material touches ground.
    var boxMaterial = new CANNON.Material("boxMaterial");
    var slippery_ground_cm = new CANNON.ContactMaterial(boxMaterial, slipperyMaterial, {
        friction: 0
    });
    // We must add the contact materials to the world
    world.addContactMaterial(slippery_ground_cm);

    this.body = CannonHelper.createBox({mesh:this.mesh, mass:boxMass, material:slippery_ground_cm});
    this.body.shapeID = this.shapeID;
    this.body.position.x = (wallData.walls.ceiling.body.position.x  -
        wallData.ceilingWidth/2) + (this.boxHeight / 2) + this.columnNumber;
    this.body.position.y = startingY;
    this.body.angularDamping = 1;
    //this.body.type = CANNON.Body.KINEMATIC;
    this.body.velocity.y = ShapeProto.normalFallingSpeed;
    //console.log(this.shapeID + " column number: " + this.columnNumber);

    //var that= this;
    //this.body.addEventListener("collide", function (event) {
    //    //event.target is the item calling the event
    //    //event.body is the item being hit by the calling item
    //    if (((event.body === wallData.ceiling.body ) ||
    //        (event.body.position.x - event.target.position.x === 0))&&
    //        ((event.body.position.y > event.target.position.y) &&
    //        (Math.abs(event.body.velocity.y) < .005))) {
    //
    //        if(that.body.position.y > that.previousMaxY) {
    //            that.previousMaxY = that.body.position.y;
    //            that.collisionHandler(that, event.body.shapeID);
    //            console.log("calling handler");
    //        }
    //    }
    //});

    this.mesh.position.copy(this.body.position);
    this.startX = this.body.position.x;
    this.destX = this.startX;
    //console.log(this.shapeID + " - " + this.shapeColor + " startX = " + this.startX);
    this.originalZPos = this.body.position.z;
    this.mesh.quaternion.copy(this.body.quaternion);

    //give the mesh the a shapeID so that we know who it belongs too
    this.mesh.userData.shapeID = this.shapeID;
    ShapeProto.meshes.push(this.mesh);

    scene.add(this.mesh);
    world.add(this.body);

    this.columnNumber = Math.floor(Math.random() * (numBoxesWide-1));

    this.activeShapeQueue[this.shapeID] = true;
    this.startPos = new CANNON.Vec3();
    this.movementQueue=[];
    ShapeProto.bolReadyForNextShape =false;
    ShapeProto.currentActiveShapeID = this.shapeID;
}

var ShapeProto = {
    //applies to all shapes; use ShapeProto
    maxYVel: 5,
    shapeID: undefined,
    currentID: 0,
    shapes: {},
    meshes: [], // keep track of the meshes seperately for ray intersection later
    world: undefined,
    boxColors: [0xff0000, 0xffff00, 0x00ff00, 0x0000ff],
    colors: ["red", "yellow", "green", "blue"],
    wallData: undefined,
    gameState: "playing",

    originalXPos: undefined,
    originalZPos: undefined,
    mesh: undefined,
    body: undefined,

    //boxColors: [0xff0000, 0xffff00],
    //colors: ["red", "yellow"],

    columnNumber: undefined,
    shapeColor: undefined,
    index: undefined,   //the position of this shape in its column
    bolIsDead: false,
    scene: undefined,
    bolIsFirstFrame: true,
    lastVel: new THREE.Vector3(),
    boxHeight: undefined,   //height of a box
    collidedWith: "none",
    movementState: undefined,
    collisionState: 'none',
    hasCollisionListener: false,
    previousMaxY: Number.NEGATIVE_INFINITY,
    restCounter: 0,

    //block status
    restState: undefined,  //undefined -> moving -> resting ->
                            // evaluated -> moving ->
    newBlock: true,
    currentActiveShapeID: 0,
    activeShapeQueue: [],

    //controlled movement related variables
    movementQueue: [], //queue holding the sideways movment commands
    startTime: undefined,
    startPos: undefined,
    startX: undefined,
    destX: undefined,
    moveLeft: false,
    moveRight: false,
    slowed: false,
    maxXVel: 10,

    //control the dropping of new shapes
    bolReadyForNextShape: true,

    //control speed of vertical travel
    bolUpButtonPressed: false,
    normalFallingSpeed: 6,
    fastFallingSpeedDelta: 20,

    //sideways movement
    bolMovingSideways : false,

    update: function (dt) {
        var movingThreshold = .5; //velocity an object must be going before it can be redeclared as moving
        var restThreshold = .75;  //time an object must be below the movingThreshold to determine if an item is resting

        this.body.inertia.set(0,0,0);
        this.body.invInertia.set(0,0,0);
        if(ShapeProto.currentActiveShapeID!==this.shapeID){
            this.body.position.x = this.destX;
        }

        this.body.position.z = this.originalZPos;

        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);

        if(this.shapeID===0) {
            //console.log(this.body.position.x, this.body.position.y, this.body.position.z);
        }

        //if((Math.abs(this.body.velocity.length()) <.01)&&
        //    (this.body.position.y - this.previousMaxY > (.9 * this.boxHeight))) {
        //    this.restCounter = 0;
        //    //this.restState = "moving";
        //
        //    //this.body.collisionResponse = true;
        //    //console.log("moving " + this.shapeID + " - " + this.shapeColor + " : vel= " + this.body.velocity.length());
        //}
        if(this.body.velocity.y < 0){
            ShapeProto.activeShapeQueue[this.shapeID] = false;
            this.body.position.x = this.destX;
        }

        //if a box is traveling above a certain speed, and
        //if the box has travelled a significant percentage of its height in the y direction
        //then we'ved confirmed that is has moved
        if((this.body.velocity.length()>movingThreshold)&&
            (this.body.position.y - this.previousMaxY > (.9 * this.boxHeight))) {
            this.restCounter = 0;
            this.restState = "moving";
            //this.body.collisionResponse = true;
            //console.log("moving " + this.shapeID + " - " + this.shapeColor + " : vel= " + this.body.velocity.length());
        }

        if((this.body.position.y > ShapeProto.wallData.walls.leftWall.mesh.position.y -
            ShapeProto.wallData.walls.leftWall.mesh.geometry.parameters.height/2)&&
            ((Math.abs(this.body.velocity.y)<=movingThreshold))) {
            this.restCounter += dt;
            //console.log(this.shapeID + " resting: " +  this.restCounter);
            if(this.newBlock === true){
                ShapeProto.bolReadyForNextShape = true; //ready for next shape to fall
                this.newBlock= false;
                //this.movementQueue =[];
                console.log(this.shapeID + " impact");
                if(this.body.position.y <  ShapeProto.wallData.walls.leftWall.mesh.position.y -
                    ShapeProto.wallData.walls.leftWall.mesh.geometry.parameters.height
                    * .25){
                        console.log("*** GAME OVER ***");
                        ShapeProto.gameState = "game over";
                    }
            }
        }



        //if the box has not already been evaluated it is the block that is currently falling
        //if it stops moving for a certain amount of time then it is considered to have hit is bottom
        if(this.restState!=="evaluated") {
            if (this.restCounter > restThreshold) {
                this.restState = "resting";
                //this.body.collisionResponse = false;
                //console.log("resting: " + this.shapeColor + " " + this.shapeID);
                this.previousMaxY = this.body.position.y;

            }
        }

        if(this.restState === "resting"){
            //console.log("match check " + this.shapeID + " | color: " + this.shapeColor);

            var matchStack = { color: this.shapeColor, matches: {}, checkedShapes: {} };   //clear the match stack prior to checking for matches
            matchStack = this.checkForMatches(matchStack, this);
            this.killMatchStickMembers(matchStack);
            this.restState = "evaluated";
            //console.log(this.restState +": " + this.shapeID);
        }

        //if(!this.bolMovingSideways) {
        //    if (this.movementQueue.length > 0) {
        //        //get the physical locations of the inside of the vertical wallData
        //        var leftBlockBoundary = ShapeProto.wallData.walls.leftWall.mesh.position.x + ShapeProto.wallData.width / 2
        //            + ShapeProto.boxHeight / 2;
        //        var rightBlockBoundary = ShapeProto.wallData.walls.rightWall.mesh.position.x - ShapeProto.wallData.width / 2
        //            - ShapeProto.boxHeight / 2;
        //
        //        //can't let body move past the boundaries so delete any commands in the movment queue that
        //        // ask us to do so
        //        if ((this.body.position.x <= leftBlockBoundary) && (this.movementQueue[0].dir === "left")) {
        //            this.movementQueue.shift();
        //        }
        //        else if ((this.body.position.x >= rightBlockBoundary) && (this.movementQueue[0].dir === "right")) {
        //            this.movementQueue.shift();
        //        }
        //        else {
        //            this.moveShapeSideways(dt);
        //        }
        //    }
        //}
        //else{
        //    this.moveShapeSideways(dt);
        //}

        //the following actions only concern the active shape
        if(ShapeProto.currentActiveShapeID === this.shapeID) {

            if (this.restState !== "resting") {
                if (!ShapeProto.bolUpButtonPressed) {
                    this.body.velocity.y = ShapeProto.normalFallingSpeed;
                }
                else {
                    this.body.velocity.y = ShapeProto.normalFallingSpeed + ShapeProto.fastFallingSpeedDelta;
                }
            }
        }
            if(this.movementQueue.length>0) {
                this.moveShapeSideways(dt);
            }

        //if(this.movementQueue[0].dir==="left"){
        //    this.moveShapeSideways(dt, "left");
        //}
        //else if(this.movementQueue[0].dir==="right"){
        //    this.moveShapeSideways(dt, "right");
        //}
        //cap the speed in the y direction
        //this.body.velocity.y = Math.min(ShapeProto.maxYVel, this.body.velocity.y);
        //ShapeProto.updateActiveShape();

        if (ShapeProto.gameState === "game over"){
            return "game over";
        }
        else{
            return "playing";
        }
    },

    moveShapeSideways : function(dt) {

        var xVel = 50;
        var slowDown = 8;

        if(this.movementQueue[0].state==="inactive"){
            //switch(this.movementQueue[0].dir){
            //    case "left":
            //        this.movementQueue[0].dest =this.body.position.x - this.boxHeight;
            //        break;
            //    case "right":
            //        this.movementQueue[0].dest =this.body.position.x + this.boxHeight;
            //        break;
            //}
            //check destination for validity
            if((this.movementQueue[0].dest > ShapeProto.wallData.walls.leftWall.body.position.x)&&
                (this.movementQueue[0].dest < ShapeProto.wallData.walls.rightWall.body.position.x)) {
                    this.movementQueue[0].start = this.body.position.x;
                    this.body.velocity.y -= slowDown;
                    this.slowed = true;
                    this.movementQueue[0].state="active";
            }
            else{   //invalid x destination
                this.body.velocity.y = ShapeProto.normalFallingSpeed;
                this.movementQueue.shift();
                return;
            }
        }
        if(this.movementQueue[0].state==="active"){
            console.log(this.shapeID + ": start pos= " +  this.movementQueue[0].start + ", dest= " +
                this.movementQueue[0].dest +
                " : current= " + this.body.position.x);
            //console.log(this.shapeID + ": cur pos= " + this.body.position.x + " : destX= " + this.destX);
            switch(this.movementQueue[0].dir){
                case "left":
                    this.body.velocity.x = Math.max(this.body.velocity.x - xVel, -ShapeProto.maxXVel);
                    break;
                case "right":
                    this.body.velocity.x = Math.min(this.body.velocity.x + xVel, ShapeProto.maxXVel);
                    break;
            }
            //track total distance traveled
            this.movementQueue[0].distanceTraveled = Math.abs(this.body.position.x - this.movementQueue[0].start);
            console.log("travel distance: " + this.movementQueue[0].distanceTraveled);

            //stop traveling if total distance traveled is greater than required
            if(this.movementQueue[0].distanceTraveled >= this.movementQueue[0].dist){
                this.body.position.x = this.movementQueue[0].dest;
                this.destX = this.movementQueue[0].dest;
                this.body.velocity.x = 0;
                this.body.velocity.y += slowDown;
                this.movementQueue[0].state = "completed";
                this.movementQueue.shift();
            }
        }




        //var currentX = this.body.position.x;
        //if(!this.bolMovingSideways) {
        //    //is the command in the movement queue left or right
        //    if (this.movementQueue[0].dir === "left") {
        //        this.destX = this.body.position.x - this.boxHeight;
        //    }
        //    else if (this.movementQueue[0].dir === "right") {
        //        this.destX = this.body.position.x + this.boxHeight;
        //    }
        //    this.startX =this.body.position.x;
        //    this.bolMovingSideways = true;
        //}
        //if(this.bolMovingSideways) {
        //    //check to see if target location is on the movement field
        //    //if((this.destX > ShapeProto.wallData.walls.leftWall.body.position.x)&&
        //    //    (this.destX < ShapeProto.wallData.walls.rightWall.body.position.x)){
        //    //move sideways
        //    if (this.movementQueue[0].dir === "left") {
        //        this.body.velocity.x = Math.max(this.body.velocity.x - xVel, ShapeProto.maxXVel);
        //        //if(!this.movementQueue[0].dest){
        //        //    this.movementQueue[0].dest = this.body.position.x - this.boxHeight;
        //        //}
        //    }
        //
        //
        //    else if (this.movementQueue[0].dir === "right") {
        //        this.body.velocity.x = Math.min(this.body.velocity.x + xVel, ShapeProto.maxXVel);
        //
        //        //if(!this.movementQueue[0].dest){
        //        //    this.movementQueue[0].dest = this.body.position.x + this.boxHeight;
        //        //}
        //    }
        //
        //    if (!this.slowed) {
        //        this.body.velocity.y -= slowDown;
        //        this.slowed = true;
        //    }
        //    if (Math.abs(this.body.position.x - this.startX) >= this.boxHeight) {
        //        console.log("movement stopped");
        //        this.body.velocity.x = 0;
        //        this.startX = this.movementQueue[0].dest;
        //        this.body.position.x = this.movementQueue[0].dest;
        //        this.body.velocity.y += slowDown;
        //        this.slowed = false;
        //        this.movementQueue.shift(); //we've completed this movement command, remove it from queue
        //        this.bolMovingSideways = false;
        //    }
        //    console.log(this.shapeID + ": cur pos= " + this.body.position.x + " : destX= " + this.destX);
        //}



    },

    tweenSideways : function(currentX, futureX){
        var tweenTime = 250;
        var dist = futureX - currentX;
        var velX = dist/tweenTime;

        var originX = currentX;
        var that = this;
        var sideTween = new TWEEN.Tween(originX).to(futureX, tweenTime)
            .easing(TWEEN.Easing.Quartic.In)
            .delay( 0 )
            //.yoyo( true )
            .easing( TWEEN.Easing.Cubic.InOut )
            .onUpdate(
            function(){
                that.body.position.x = originX;
                console.log("position.x : " + originX);
            });
        sideTween.start();
    },


    //mark this blick as dead.  We'll remove all the dead blocks in one go
    kill: function (id) {
        ShapeProto.shapes[id].bolIsDead = true;
    },

    //remove the dead blocks from the data matrix
    removeDeadBlocks: function (scene, world) {

        //loop through the shapes and update
        for (var key in ShapeProto.shapes) {
            if (ShapeProto.shapes.hasOwnProperty(key)) {
                var shape = ShapeProto.shapes[key];
                if(shape.bolIsDead){
                    scene.remove(shape.mesh);
                    delete ShapeProto.shapes[key];
                    world.removeBody(shape.body);
                }
            }
        }
    },

    //collisionHandler: function (source, collidedWithID) {
    //
    //    if ((source.collidedWith !== collidedWithID) && (source.collisionState==='none')){
    //        source.collisionState = 'initialCollision';
    //        console.log(source.shapeID + " initialCollision collision");
    //    }
    //    else if (source.collidedWith !== collidedWithID) {
    //        //console.log(this.shapeID + " followOnCollision collision");
    //        source.collisionState = 'followOnCollision';
    //        console.log(source.shapeID + " Collided with body:",  collidedWithID);
    //    }
    //    this.collidedWith = collidedWithID;
    //
    //    ////this is not a blocks initial collision, but still check to see if it has any matches
    //    if ((source.collisionState === 'followOnCollision')||(source.collisionState ==='initialCollision')){
    //        //check for matches
    //        //console.log(this.collisionState + " for ID: " + this.shapeID + " | col# " + this.columnNumber + ", " + this.index);
    //        var matchStack = { color: source.shapeColor, matches: {}, checkedShapes: {} };   //clear the match stack prior to checking for matches
    //        matchStack = source.checkForMatches(matchStack, source);
    //        source.killMatchStickMembers(matchStack);
    //        source.collisionState = 'collisionHandled';
    //
    //        //ignore futher collisions
    //        this.body.collisionResponse = false;
    //
    //
    //    }
    //},

    killMatchStickMembers: function (matchStack) {
        //print out the nuber of matches
        var numMatches = Object.keys(matchStack.matches).length;
        if (numMatches > 1) {
            //console.log(numMatches + " " + matchStack.color  + " matches found");

            //remove the matching blocks from the scene
            if (Object.keys(matchStack.matches).length >= numBlocksToMatch) {
                for (var key in matchStack.matches) {
                    if (matchStack.matches.hasOwnProperty(key)) {
                        ShapeProto.kill(key);
                    }
                }
            }
        }
    },

    setShapeMovement: function (direction) {
        var shape = ShapeProto.shapes[ShapeProto.currentActiveShapeID];
        if(shape.movementQueue.length>0) {
            var startLoc = shape.movementQueue[shape.movementQueue.length - 1].dest;
        }
        else{
            var startLoc = shape.body.position.x;
        }

        var dest;
        switch (direction){
            case "left":
                dest = startLoc - shape.boxHeight;
                break;
            case "right":
                dest = startLoc + shape.boxHeight;
                break;
        }
        var movementObject ={};
        movementObject.dist = shape.boxHeight;
        movementObject.dir = direction;
        movementObject.dest = dest;
        movementObject.start = 0;
        movementObject.state = "inactive";
        //shape.movementQueue[shape.movementQueue.length] = movementObject
        shape.movementQueue.push(movementObject);
    }
    ,

    /************************************
     * checkForMatches
     *  recursively checks for color matches in the blocks above, below, to the left, and the right.  If a match is found
     *  then place it in the matchStack and then search its neighbors
     * Parameters:
     *  matchStack: the stack of matching shapes, contains the color that we are looking for as "color"
     *  shape: the shape who's neighbors will be examined
     * Returns:
     *  matchStack
     */
    checkForMatches: function (matchStack, shape) {
        //check to see if this shape is already in the match stack
        // if it is then just return the stack
        if (!matchStack.matches[shape.shapeID]) {
            //console.log("checking " + matchStack.color + " at " + shape.columnNumber + ", " + shape.index);
            if (this.shapeColor === matchStack.color) {
                matchStack.matches[shape.shapeID] = this;
                matchStack.checkedShapes[shape.shapeID] = true;

                var originPoint = shape.mesh.position.clone();
                var myRays = {};

                myRays.left = new THREE.Raycaster(originPoint, new THREE.Vector3(-this.boxHeight / 2, 0, 0),
                    this.boxHeight / 3, this.boxHeight / 2 + this.boxHeight);
                myRays.right = new THREE.Raycaster(originPoint, new THREE.Vector3(this.boxHeight / 2, 0, 0),
                    this.boxHeight / 3, this.boxHeight / 2 + this.boxHeight);
                myRays.top = new THREE.Raycaster(originPoint, new THREE.Vector3(0, this.boxHeight / 2, 0),
                    this.boxHeight / 3, this.boxHeight / 2 + this.boxHeight);
                myRays.bottom = new THREE.Raycaster(originPoint, new THREE.Vector3(0, -this.boxHeight / 2, 0),
                    this.boxHeight / 3, this.boxHeight / 2 + this.boxHeight);


                for (var rayKey in myRays) {
                    if (myRays.hasOwnProperty(rayKey)) {
                        //    var collisionResults = myRays[rayKey].intersectObjects( ShapeProto.meshes);
                        //    console.log(shape.shapeColor + " : " + shape.shapeID + " # intersections = " + collisionResults.length);
                        //    if(collisionResults.length>0){
                        //        for(var i= 0; i<collisionResults.length; i++){
                        //            var checkedShape = ShapeProto.shapes[collisionResults[i].object.userData.shapeID];
                        //            if(!matchStack.checkedShapes[checkedShape.shapeID]) {
                        //                //console.log("adjacent Found: " + shape.shapeID + " : " + ShapeProto.shapes[key].shapeID );
                        //                if (checkedShape.shapeColor === shape.shapeColor) {
                        //                    this.checkForMatches(matchStack, checkedShape);
                        //                }
                        //            }
                        //        }
                        //    }
                        //}
                        //loop through the shapes and update
                        for (var key in ShapeProto.shapes) {
                            if (ShapeProto.shapes.hasOwnProperty(key)) {
                                if (ShapeProto.shapes[key].shapeID !== shape.shapeID) {
                                    var collisionResults = myRays[rayKey].intersectObject(ShapeProto.shapes[key].mesh);
                                    if (collisionResults.length > 0) {
                                        if (!matchStack.checkedShapes[ShapeProto.shapes[key].shapeID]) {
                                            //console.log("adjacent Found: " + shape.shapeID + " : " + ShapeProto.shapes[key].shapeID );
                                            if (ShapeProto.shapes[key].shapeColor === shape.shapeColor) {
                                                this.checkForMatches(matchStack, ShapeProto.shapes[key]);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }


        return matchStack;
    },

    canvasTexture: function(id,color) {
        var size = 257;
        var canvas = document.createElement('canvas');

        canvas.width = canvas.height = size;
        var context = canvas.getContext('2d');
        context.font = '100pt Arial';
        context.fillStyle = color;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'white';
        context.fillRect(20, 20, canvas.width - 40, canvas.height - 40);
        context.fillStyle = 'black';
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(id, canvas.width / 2, canvas.height / 2);

        return canvas;
    }


};

Shape.prototype = ShapeProto;