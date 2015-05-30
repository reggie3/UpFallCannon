/**
 * Created by Reginald on 4/30/2015.
 */

var AmmoPhysicsHelper = {
    initPhysics: function (physicsWorld) {
        var collision_config = new Ammo.btDefaultCollisionConfiguration();
        var dispatcher = new Ammo.btCollisionDispatcher(collision_config);
        var overlappingPairCache = new Ammo.btDbvtBroadphase();
        var solver = new Ammo.btSequentialImpulseConstraintSolver();
        physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collision_config);
        physicsWorld.setGravity(new Ammo.btVector3(0, -12, 0));

        return physicsWorld;
    },

    b2three: function (trans, mat) {
        var basis = trans.getBasis();
        var origin = trans.getOrigin();
        var m = mat.elements;

        var v = basis.getRow(0);
        m[0] = v.x();
        m[4 + 0] = v.y();
        m[8 + 0] = v.z();
        m[12 + 0] = origin.x();

        v = basis.getRow(1);
        m[1] = v.x();
        m[4 + 1] = v.y();
        m[8 + 1] = v.z();
        m[12 + 1] = origin.y();

        v = basis.getRow(2);
        m[2] = v.x();
        m[4 + 2] = v.y();
        m[8 + 2] = v.z();
        m[12 + 2] = origin.z();

        m[3] = 0.0;
        m[4 + 3] = 0.0;
        m[8 + 3] = 0.0;
        m[12 + 3] = 1.0;
    },

    /**********************
     * updateMesh
     * update the given mesh with the given transform
     */
     updateMesh: function (mesh, tranform) {
        var origin = tranform.getOrigin();
        mesh.position.x = origin.x();
        mesh.position.y = origin.y();
        mesh.position.z = origin.z();

        // Update rotation
        var rotation = tranform.getRotation();
        mesh.quaternion.x = rotation.x();
        mesh.quaternion.y = rotation.y();
        mesh.quaternion.z = rotation.z();
        mesh.quaternion.w = rotation.w();


        mesh.updateMatrix();
    },
    

    getTrans : function () {
        return new Ammo.btTransform();
    },

    body2world: function (body, v3B) {
        var trans = body.getWorldTransform();
        var result = trans.op_mul(v3B);
        return result;
    },

    //createCollisionShape: function (mesh, mass, shape, color, dynamicsWorld) {
    //    mesh.updateMatrix();
    //    mesh.updateMatrixWorld();
    //    if (!mesh.geometry.boundingBox)
    //        mesh.geometry.computeBoundingBox();
    //    if (!mesh.geometry.boundingSphere)
    //        mesh.geometry.computeBoundingSphere();
    //
    //    var bb = mesh.geometry.boundingBox;
    //    var xdim = bb.max.x - bb.min.x;
    //    var ydim = bb.max.y - bb.min.y;
    //    var zdim = bb.max.z - bb.min.z;
    //    var bs = mesh.geometry.boundingSphere;
    //
    //    var collmesh;
    //    if (shape == "sphere") {
    //        // physics collision shape
    //        var shape = new Ammo.btSphereShape(bs.radius);
    //        // three.js collision shape
    //        collmesh = new THREE.Mesh(
    //            new THREE.SphereGeometry(bs.radius),
    //            new THREE.MeshLambertMaterial({ color: color, ambient: color })
    //            );
    //        collmesh.position.copy(bs.center);
    //    }
    //    /*
    //     // cylinder not usable currently
    //     // Needs code to compute dimensions
    //     // and appropriate orientation (tipped on side currently)
    //     else if (shape=="cylinder") {
    //     // physics collision shape
    //     var shape=new Ammo.btCylinderShape(new Ammo.btVector3(bs.radius,bs.radius,bs.radius));
    //     // three.js collision shape
    //     collmesh = new THREE.Mesh(
    //     new THREE.CylinderGeometry( bs.radius, bs.radius, 2*bs.radius ),
    //     new THREE.MeshLambertMaterial( { color: color, ambient: color } )
    //     );
    //     collmesh.position.copy(bs.center);
    //     }
    //     */
    //    else if (shape == "plane") {
    //        // physics collision shape
    //        var normalDir = new Ammo.btVector3(1, 0, 0);
    //        var planeConstant = bs.center.x;
    //        var minDim = xdim;
    //        if (ydim < minDim) {
    //            normalDir.setValue(0, 1, 0);
    //            planeConstant = bs.center.y;
    //            minDim = ydim;
    //        }
    //        if (zdim < minDim) {
    //            normalDir.setValue(0, 0, 1);
    //            planeConstant = bs.center.z;
    //            minDim = zdim;
    //        }
    //        var maxWidth = Math.max(xdim, ydim, zdim);
    //        var shape = new Ammo.btStaticPlaneShape(normalDir, planeConstant);
    //        // three.js collision shape
    //        collmesh = new THREE.Mesh(
    //            new THREE.PlaneGeometry(2 * maxWidth, 2 * maxWidth),
    //            new THREE.MeshLambertMaterial({ color: color, ambient: color })
    //            );
    //        if (normalDir.x()) collmesh.rotation.y = Math.PI / 2;
    //        if (normalDir.y()) collmesh.rotation.x = Math.PI / 2;
    //        collmesh.position.copy(bs.center);
    //    }
    //    else { // box
    //        // physics collision shape
    //        var shape = new Ammo.btBoxShape(new Ammo.btVector3(xdim / 2, ydim / 2, zdim / 2));
    //        // three.js collision shape
    //        collmesh = new THREE.Mesh(
    //            new THREE.CubeGeometry(xdim, ydim, zdim),
    //            new THREE.MeshLambertMaterial({ color: color, ambient: color })
    //            );
    //        collmesh.position.set(bb.min.x + xdim / 2, bb.min.y + ydim / 2, bb.min.z + zdim / 2);
    //    }
    //
    //    // init physics transform from three transform
    //    var transform = new Ammo.btTransform();
    //    var mat = mesh.matrixWorld;
    //    three2b(mat, transform);
    //
    //    var localInertia = new Ammo.btVector3(0, 0, 0);
    //    if (mass > 0.0)
    //        shape.calculateLocalInertia(mass, localInertia);
    //    var motionState = new Ammo.btDefaultMotionState(transform);
    //    var cInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
    //    var body = new Ammo.btRigidBody(cInfo);
    //    dynamicsWorld.addRigidBody(body);
    //    // three.js collision shape
    //    return { mesh: collmesh, body: body };
    //},

    /****************
     *
     * @param mesh - a three.js mesh
     * @constructor
     * @param physicsWorld
     */
    CreateBouncyBall: function (mesh, physicsWorld, restitution) {
        console.log(mesh);
        mesh.geometry.computeBoundingSphere();

        var shape = new Ammo.btSphereShape(mesh.geometry.boundingSphere.radius);
        //var shape = new Ammo.btSphereShape(mesh.geometry.boundingSphere.radius * mesh.scale);

        var transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(mesh.position.x, mesh.position.y, mesh.position.z));

        var localInertia = new Ammo.btVector3(0, 0, 0);
        var motionState = new Ammo.btDefaultMotionState(transform);
        var mass = .5;
        shape.calculateLocalInertia(mass, localInertia);

        var constructionInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
        var body = new Ammo.btRigidBody(constructionInfo);

        // turns off all rotation
        body.setAngularFactor(0, 0, 0);

        body.setWorldTransform(transform);
        if(restitution){
            //console.log("restitution = " + restitution);
            body.setRestitution(restitution);
        } 

        // keeps physics from going to sleep (from bullet documentation)
        var DISABLE_DEACTIVATION = 4;
        body.setActivationState(DISABLE_DEACTIVATION);

        physicsWorld.addRigidBody(body);
        body.name = mesh.name;
        return body;
    },

    /****************
     *
     * @param mesh
     * @constructor
     */
    CreateStaticBox: function (mesh, physicsWorld, restitution) {

        var box = new THREE.Box3();
        box.setFromObject(mesh);


        var xdim = box.max.x - box.min.x;
        var ydim = box.max.y - box.min.y;
        var zdim = box.max.z - box.min.z;

        var shape = new Ammo.btBoxShape(new Ammo.btVector3(xdim / 2, ydim / 2, zdim / 2));

        var transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(mesh.position.x, mesh.position.y, mesh.position.z));

        var localInertia = new Ammo.btVector3(0, 0, 0);
        var motionState = new Ammo.btDefaultMotionState(transform);

        var constructionInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, shape, localInertia);
        var body = new Ammo.btRigidBody(constructionInfo);
        //body.setWorldTransform(transform);
        physicsWorld.addRigidBody(body);
        // turns off all rotation
        body.setAngularFactor(0, 0, 0);
        body.name = mesh.name;
        if(restitution){
            //console.log("restitution = " + restitution);
            body.setRestitution(restitution);
        } 

        return body;
    },
    
    /*********************
     * CreateBox
     */
     CreateBox: function (mesh, physicsWorld, mass, restitution) {

        var box = new THREE.Box3();
        box.setFromObject(mesh);


        var xdim = box.max.x - box.min.x;
        var ydim = box.max.y - box.min.y;
        var zdim = box.max.z - box.min.z;

        var shape = new Ammo.btBoxShape(new Ammo.btVector3(xdim / 2, ydim / 2, zdim / 2));

        var transform = new Ammo.btTransform();
        transform.setIdentity();
        transform.setOrigin(new Ammo.btVector3(mesh.position.x, mesh.position.y, mesh.position.z));

        var localInertia = new Ammo.btVector3(0, 0, 0);
        var motionState = new Ammo.btDefaultMotionState(transform);
        
        var constructionInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
        var body = new Ammo.btRigidBody(constructionInfo);
        body.setWorldTransform(transform);
        physicsWorld.addRigidBody(body);
        // turns off all rotation
        body.setAngularFactor(0, 0, 0);
        body.name = mesh.name;
        if(restitution){
            //console.log("restitution = " + restitution);
            body.setRestitution(restitution);
        } 

        return body;
    }





}