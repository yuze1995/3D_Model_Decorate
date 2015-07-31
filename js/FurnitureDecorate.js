var container, camera, scene, renderer, raycaster, INTERSECTED, loader = new THREE.OBJMTLLoader();
var planeContent, mouse = new THREE.Vector2(), wall1, wall2, basePlane;
var radious = 650, theta = 45, phi = 60, onMouseDownPhi = 60, onMouseDownPosition = new THREE.Vector2();
var isChoosed = false, isRender = true, isShiftDown = false, isMouseDown = false;
var objList = [], planeList = [], ChoosedPlane = [], usedPlane = [], allObjList = [], objGroupList = [] /*存放目前已放置之模型所佔用plane Num ex.[[0,1,11,12],null,...]*/
var objType = 0, ChoosedObjType = 0 /*目前被選中的物件種類*/, nowObj, usedObjPosition = { x: 0, z: 0 };

var oldListItem/*目前選中模型*/, oldListItemColor/*目前選中顏色*/, oldItemColor /*目前選中模型原本底色*/;

$(function () {
    if (!Detector.webgl)
        Detector.addGetWebGLMessage();

    init();
})

function init() {
    camera = new THREE.PerspectiveCamera(75, $("#3DView").width() / $("#3DView").height(), 1, 10000); //建立相機

    //設定鏡頭起始位置
    camera.position.x = radious * Math.sin(theta * Math.PI / 360) * Math.cos(phi * Math.PI / 360);
    camera.position.y = radious * Math.sin(phi * Math.PI / 360);
    camera.position.z = radious * Math.cos(theta * Math.PI / 360) * Math.cos(phi * Math.PI / 360);
    camera.lookAt(0, 0, 0)

    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); //建立渲染器
    renderer.setSize(1280, 900); //設定畫面大小
    renderer.setClearColor(0xf0f0f0); //設定畫面底色

    scene = new THREE.Scene(); //建立場景

    var light = new THREE.DirectionalLight(0xffffff, 1.3);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    container = renderer.domElement;
    $("#3DView").append(container);

    raycaster = new THREE.Raycaster();

    var isEdge = false, whichEdge;
    var bigP = new THREE.BoxGeometry(50, 1, 50), smallP = new THREE.BoxGeometry(25, 1, 25), smallM = new THREE.MeshBasicMaterial({ visible: false });

    var wall1_P = new THREE.BoxGeometry(550, 220, 1), wall2_P = new THREE.BoxGeometry(1, 220, 550);
    var wall_back = new THREE.MeshBasicMaterial({ color: 0x000000 });

    wall1 = new THREE.Mesh(wall1_P, new THREE.MeshBasicMaterial({ color: 0xfdfdfd, map: THREE.ImageUtils.loadTexture('../image/Layout/America/america_wall_1.jpg') }));
    wall2 = new THREE.Mesh(wall2_P, new THREE.MeshBasicMaterial({ color: 0xfdfdfd, map: THREE.ImageUtils.loadTexture('./image/Layout/America/america_wall_2.jpg') }));
    var wall1_back = new THREE.Mesh(wall1_P, wall_back);
    var wall2_back = new THREE.Mesh(wall2_P, wall_back);

    wall1.position.set(0, 110, -275);
    wall2.position.set(-275, 110, 0)
    wall1_back.position.set(0, 110, -275.3);
    wall2_back.position.set(-275.3, 110, 0)

    wall1.objType = "wall";
    wall2.objType = "wall";
    wall1_back.objType = "wall";
    wall2_back.objType = "wall";

    scene.add(wall1, wall2, wall1_back, wall2_back);

    basePlane = new THREE.Mesh(new THREE.BoxGeometry(550, 550, 1), new THREE.MeshBasicMaterial({ color: 0xfdfdfd, map: THREE.ImageUtils.loadTexture('./image/Layout/America/america_plane.jpg') }));
    basePlane.rotation.x = 90 * Math.PI / 180;
    scene.add(basePlane);

    //繪製地面
    var num = 0, x = -250, z = -250;

    //isEdge => 九宮格
    // 123
    // 456
    // 789
    for (var i = 0 ; i < 11; i++) {
        for (var j = 0; j < 11; j++) {
            num++;
            //設定地板資料(表現層為陰影)
            planeContent = {
                plane: null,
                GroupNum: null, //存放 占用此格地板之模型在objGroupList之index
                num: num, //地板編號
                objType: null, //占用此格地板之模型類別
                originHex: (num % 2 == 0 ? 0xff0000 : 0xff0000), //地板原始顏色
                isEdge: (num % 11 == 1 || num % 11 == 0 || (num >= 0 && num <= 11) || (num >= 111 && num <= 121) ? true : false), //是否為邊緣之地板
                whichEdge: (num == 1 ? 1 : (num == 11 ? 3 : (num == 111 ? 7 : (num == 121 ? 9 : (num % 11 == 1 ? 4 : (num % 11 == 0 ? 6 : ((num >= 0 && num <= 11) ? 2 : ((num >= 111 && num <= 121) ? 8 : 5)))))))) // 在九宮格中之位置
            }

            planeContent.plane = new THREE.Mesh(bigP, new THREE.MeshBasicMaterial({ color: 0x33FF33, transparent: true, opacity: 0.7 }));

            var plane1 = new THREE.Mesh(smallP, smallM);
            var plane2 = new THREE.Mesh(smallP, smallM);
            var plane3 = new THREE.Mesh(smallP, smallM);
            var plane4 = new THREE.Mesh(smallP, smallM);

            planeContent.plane.position.set(x, 0.1, z);
            planeContent.plane.visible = false;

            planeList.push(planeContent);

            setPlanePrama(plane1, plane2, plane3, plane4, x - 12.5, z - 12.5, planeContent.originHex, num, planeContent.whichEdge);

            scene.add(planeContent.plane, plane1, plane2, plane3, plane4);
            x += 50;
        }
        x = -250;
        z += 50;
    }

    //初始化物件陣列長度
    for (var i = 0 ; i < 121; i++) {
        objList.push(null);
    }

    //設定模型列表陣列格
    for (var i = 0; i < $("#ObjList").children().children().children().length; i++) {
        var objs = [];
        for (var j = 0; j < $("#ObjList").children().children().children().eq(i).children(".productColor").children().length; j++) {
            objs.push(null)
        }
        allObjList.push(objs)
    }

    document.addEventListener('mousemove', onDocumentMouseMove, false);
    container.addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('mouseup', onDocumentMouseUp, false);
    document.addEventListener('mousewheel', onDocumentMouseWheel, false);

    document.addEventListener('keydown', onDocumentKeyDown, false);
    document.addEventListener('keyup', onDocumentKeyUp, false);

    $(".fa-picture-o").click(Get3DImage);
    $(".fa-refresh").click(ClearAll);
    $(".fa-share").click(TurnRight);
    $(".fa-reply").click(TurnLeft);

    $("#Style").change(ChangeStyle);

    $("#ObjList tr").click(ClickListItem);
    $("#ObjList tr .productColor i").click(ClickListItemColor);

    animate();

    $("#mask").css("display", "none");
}

//設定1/4地板資料
function setPlanePrama(plane1, plane2, plane3, plane4, x, z, color, num, whichEdge) {
    plane1.position.set(x, 0.2, z);
    plane2.position.set(x + 25, 0.2, z);
    plane3.position.set(x, 0.2, z + 25);
    plane4.position.set(x + 25, 0.2, z + 25);

    plane1.num = num;
    plane2.num = num;
    plane3.num = num;
    plane4.num = num;

    //判斷要傾向四角的哪一角
    //12
    //34
    plane1.privateId = (whichEdge == 1 ? 4 : (whichEdge == 3 ? 3 : (whichEdge == 7 ? 2 : (whichEdge == 9 ? 1 : (whichEdge == 2 ? 3 : (whichEdge == 4 ? 2 : (whichEdge == 6 ? 1 : (whichEdge == 8 ? 1 : 1))))))));
    plane2.privateId = (whichEdge == 1 ? 4 : (whichEdge == 3 ? 3 : (whichEdge == 7 ? 2 : (whichEdge == 9 ? 1 : (whichEdge == 2 ? 4 : (whichEdge == 4 ? 2 : (whichEdge == 6 ? 1 : (whichEdge == 8 ? 2 : 2))))))));
    plane3.privateId = (whichEdge == 1 ? 4 : (whichEdge == 3 ? 3 : (whichEdge == 7 ? 2 : (whichEdge == 9 ? 1 : (whichEdge == 2 ? 3 : (whichEdge == 4 ? 4 : (whichEdge == 6 ? 3 : (whichEdge == 8 ? 1 : 3))))))));
    plane4.privateId = (whichEdge == 1 ? 4 : (whichEdge == 3 ? 3 : (whichEdge == 7 ? 2 : (whichEdge == 9 ? 1 : (whichEdge == 2 ? 4 : (whichEdge == 4 ? 4 : (whichEdge == 6 ? 3 : (whichEdge == 8 ? 2 : 4))))))));
}

//持續渲染畫面
function animate() {
    requestAnimationFrame(animate);
    render();
}

//添加模型
function setObj() {
    var usedObj = nowObj.clone();

    if (objType == 1) {
        usedObj.position.set(planeList[INTERSECTED.num - 1].plane.position.x, 0, planeList[INTERSECTED.num - 1].plane.position.z)
    }
    else if (objType == 2) {
        switch (INTERSECTED.privateId) {
            case 1:
                usedObj.position.set(planeList[INTERSECTED.num - 1].plane.position.x - 25, 0, planeList[INTERSECTED.num - 1].plane.position.z - 25)
                break;
            case 2:
                usedObj.position.set(planeList[INTERSECTED.num - 1].plane.position.x + 25, 0, planeList[INTERSECTED.num - 1].plane.position.z - 25)
                break;
            case 3:
                usedObj.position.set(planeList[INTERSECTED.num - 1].plane.position.x - 25, 0, planeList[INTERSECTED.num - 1].plane.position.z + 25)
                break;
            case 4:
                usedObj.position.set(planeList[INTERSECTED.num - 1].plane.position.x + 25, 0, planeList[INTERSECTED.num - 1].plane.position.z + 25)
                break;
        }
    }
    else if (objType == 3) {
        if (!planeList[INTERSECTED.num - 1].isEdge) {
            usedObj.position.set(planeList[INTERSECTED.num - 1].plane.position.x, 0, planeList[INTERSECTED.num - 1].plane.position.z)
        } else {
            switch (planeList[INTERSECTED.num - 1].whichEdge) {
                case 1:
                    usedObj.position.set(planeList[12].plane.position.x, 0, planeList[12].plane.position.z)
                    break;
                case 2:
                    usedObj.position.set(planeList[INTERSECTED.num + 10].plane.position.x, 0, planeList[INTERSECTED.num + 10].plane.position.z)
                    break;
                case 3:
                    usedObj.position.set(planeList[20].plane.position.x, 0, planeList[20].plane.position.z)
                    break;
                case 4:
                    usedObj.position.set(planeList[INTERSECTED.num - 11].plane.position.x, 0, planeList[INTERSECTED.num - 11].plane.position.z)
                    break;
                case 6:
                    usedObj.position.set(planeList[INTERSECTED.num - 2].plane.position.x, 0, planeList[INTERSECTED.num - 2].plane.position.z)
                    break;
                case 7:
                    usedObj.position.set(planeList[100].plane.position.x, 0, planeList[100].plane.position.z)
                    break;
                case 8:
                    usedObj.position.set(planeList[INTERSECTED.num - 12].plane.position.x, 0, planeList[INTERSECTED.num - 12].plane.position.z)
                    break;
                case 9:
                    usedObj.position.set(planeList[108].plane.position.x, 0, planeList[108].plane.position.z)
                    break;
            }
        }
    }

    objGroupList.push(usedPlane);
    setObjListInfo(usedPlane, usedObj)
    scene.add(usedObj);
    isRender = true
    isChoosed = false;
    setOriginColor(ChoosedPlane);
    ChoosedPlane = [];
}

function setObjListInfo(objNums, object) {
    for (var i = 0; i < objNums.length; i++) {
        objList[objNums[i]] = object;
        planeList[objNums[i]].objType = objType;
        planeList[objNums[i]].GroupNum = objGroupList.length - 1;
    }
}

function render() {

    if (!isRender) {
        $("#mask").css("display", "block");

        if (usedPlane.length > 0)
            setOriginColor(usedPlane);
        setOriginColor(ChoosedPlane);
        isChoosed = false;
        renderer.render(scene, camera);
        return false;
    }

    $("#mask").css("display", "none");

    camera.lookAt(scene.position);
    camera.updateMatrixWorld();

    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(scene.children);

    if (isShiftDown) { //按下shift 顯示地面
        CheckUsedPlane(intersects.length > 0 ? intersects[0].object : null)
    }

    if (intersects.length > 0) {
        if (!isNaN(intersects[0].object.num - 1))
            if (planeList[intersects[0].object.num - 1].objType != null)
                CheckUsedPlane(intersects.length > 0 ? intersects[0].object : null)
    }
    if (objType == 1) {  // 1*1 物件
        planeShadow11(intersects.length > 0 ? intersects[0].object : null)
    }
    else if (objType == 2) { // 2*2 物件
        planeShadow22(intersects.length > 0 ? intersects[0].object : null)
    }
    else if (objType == 3) { // 3*3 物件
        planeShadow33(intersects.length > 0 ? intersects[0].object : null)
    }

    if (isChoosed == true) {
        for (var i = 0; i < ChoosedPlane.length; i++) {
            planeList[ChoosedPlane[i]].plane.material.color.set(0x207ee5)
            planeList[ChoosedPlane[i]].plane.visible = true;
        }
    }


    renderer.render(scene, camera);
}

/////////////////////////////////觸發事件////////////////////////////////////

function onDocumentKeyDown(event) {
    if (event.keyCode == 16) {
        isShiftDown = true;
        if (planeList[INTERSECTED.num - 1].GroupNum == null) {
            setOriginColor(usedPlane)
            setOriginColor(ChoosedPlane)
            usedPlane = []
            ChoosedPlane = []
            isChoosed = false;
        }
    }
}

function onDocumentKeyUp(event) {
    if (event.keyCode == 16)
        isShiftDown = false;
}

function onDocumentMouseDown(event) {
    event.preventDefault();

    isMouseDown = true;
    setOriginColor(usedPlane);

    onMouseDownTheta = theta;
    onMouseDownPhi = phi;
    onMouseDownPosition.x = event.clientX;
    onMouseDownPosition.y = event.clientY;
}

function onDocumentMouseMove(event) {
    event.preventDefault();

    mouse.x = (event.clientX / container.width) * 2 - 1;
    mouse.y = -(event.clientY / container.height) * 2 + 1;

    if (event.target.nodeName != "CANVAS")
        return;

    if (isMouseDown && isRender) {
        theta = -((event.clientX - onMouseDownPosition.x) * 0.5) + onMouseDownTheta;
        phi = ((event.clientY - onMouseDownPosition.y) * 0.5) + onMouseDownPhi;

        phi = Math.min(180, Math.max(0, phi));

        camera.position.x = radious * Math.sin(theta * Math.PI / 360) * Math.cos(phi * Math.PI / 360);
        camera.position.y = radious * Math.sin(phi * Math.PI / 360);
        camera.position.z = radious * Math.cos(theta * Math.PI / 360) * Math.cos(phi * Math.PI / 360);
    }
}

function onDocumentMouseUp(event) {
    event.preventDefault();
    isMouseDown = false;

    onMouseDownPosition.x = event.clientX - onMouseDownPosition.x;
    onMouseDownPosition.y = event.clientY - onMouseDownPosition.y;

    if (onMouseDownPosition.length() > 5) {
        return;
    }

    if (event.target.nodeName != "CANVAS") {
        return;
    }

    //判斷要增加或刪除模型
    if (!INTERSECTED || INTERSECTED == null) {
        isChoosed = false;
        for (var i = 0; i < ChoosedPlane.length; i++)
            planeList[ChoosedPlane[i]].plane.visible = false;
        setOriginColor(ChoosedPlane)
        ChoosedPlane = [];
        $("#rotateDiv").hide();
        objType = ChoosedObjType;
        return;
    }

    var position;
    isRender = false;

    if (isShiftDown) {
        for (var i = 0 ; i < usedPlane.length; i++) {
            $("#mask").css("display", "block");
            scene.remove(objList[usedPlane[i]]);
            objList[usedPlane[i]] = null;
            planeList[usedPlane[i]].objType = null;
            objGroupList[planeList[usedPlane[i]].GroupNum] = null;
            planeList[usedPlane[i]].GroupNum = null;
        }

        isRender = true;
        isChoosed = false;
        ChoosedPlane = [];
        $("#rotateDiv").hide();
    }
    else {
        if (planeList[INTERSECTED.num - 1].objType != null) { //點擊到存在模型之地面時 要設定為選中
            if (isChoosed) {
                setOriginColor(ChoosedPlane);
                ChoosedPlane = [];
            }
            for (var i = 0; i < objGroupList[planeList[INTERSECTED.num - 1].GroupNum].length; i++) {
                ChoosedPlane.push(planeList[objGroupList[planeList[INTERSECTED.num - 1].GroupNum][i]].num - 1);
            }
            isChoosed = true;
            isRender = true
            objType = planeList[INTERSECTED.num - 1].objType;
            $("#rotateDiv").show();
            return;
        }
        else {
            var selectObj;

            //判斷目前是否有選中模型
            if (ChoosedPlane.length > 0) {
                //判斷目前滑鼠遮蓋的的範圍中是否有任何區塊有模型，有就退出
                for (var i = 0 ; i < usedPlane.length; i++) {
                    if (planeList[usedPlane[i]].objType != null) {
                        $("#mask").css("display", "none");
                        isRender = true;
                        $("#rotateDiv").show();
                        return;
                    }
                }

                selectObj = objList[ChoosedPlane[0]];
                setOriginColor(ChoosedPlane);

                for (var i = 0; i < ChoosedPlane.length; i++) {
                    scene.remove(objList[ChoosedPlane[i]]);
                    objList[ChoosedPlane[i]] = null;
                    planeList[ChoosedPlane[i]].objType = null;
                    objGroupList[planeList[ChoosedPlane[i]].GroupNum] = null;
                    planeList[ChoosedPlane[i]].GroupNum = null;
                }

                SetObjPosition();
                ChoosedPlane = [];
                objGroupList.push(usedPlane);

                selectObj.position.set(usedObjPosition.x, 0, usedObjPosition.z);

                for (var i = 0; i < usedPlane.length; i++) {
                    objList[usedPlane[i]] = selectObj;
                    planeList[usedPlane[i]].objType = objType;
                    objGroupList[planeList[usedPlane[i]].GroupNum] = null;
                    planeList[usedPlane[i]].GroupNum = objGroupList.length - 1;
                }

                scene.add(selectObj)
                isRender = true;
                ChoosedPlane = usedPlane;
                $("#mask").css("display", "none");
                $("#rotateDiv").show();
                return;
            }
        }

        //判斷是否可以
        for (var i = 0; i < usedPlane.length; i++) {
            if (planeList[usedPlane[i]].objType != null) {
                $("#mask").css("display", "none");
                isRender = true;
                $("#rotateDiv").hide();
                return;
            }
        }
        setObj();
    }
    $("#mask").css("display", "none");
    isRender = true;
}

function onDocumentMouseWheel(event) {
    radious -= event.wheelDeltaY;

    if (event.target.nodeName != "CANVAS")
        return;

    camera.position.x = radious * Math.sin(theta * Math.PI / 360) * Math.cos(phi * Math.PI / 360);
    camera.position.y = radious * Math.sin(phi * Math.PI / 360);
    camera.position.z = radious * Math.cos(theta * Math.PI / 360) * Math.cos(phi * Math.PI / 360);
}

function SetObjPosition() {
    if (objType == 1) {
        usedObjPosition.x = planeList[INTERSECTED.num - 1].plane.position.x;
        usedObjPosition.z = planeList[INTERSECTED.num - 1].plane.position.z;
        return;
    }
    else if (objType == 2) {
        switch (INTERSECTED.privateId) {
            case 1:
                usedObjPosition.x = planeList[INTERSECTED.num - 1].plane.position.x - 25;
                usedObjPosition.z = planeList[INTERSECTED.num - 1].plane.position.z - 25;
                return;
            case 2:
                usedObjPosition.x = planeList[INTERSECTED.num - 1].plane.position.x + 25;
                usedObjPosition.z = planeList[INTERSECTED.num - 1].plane.position.z - 25;
                return;
            case 3:
                usedObjPosition.x = planeList[INTERSECTED.num - 1].plane.position.x - 25;
                usedObjPosition.z = planeList[INTERSECTED.num - 1].plane.position.z + 25;
                return;
            case 4:
                usedObjPosition.x = planeList[INTERSECTED.num - 1].plane.position.x + 25;
                usedObjPosition.z = planeList[INTERSECTED.num - 1].plane.position.z + 25;
                return;
        }
    }
    else if (objType == 3) {
        if (!planeList[INTERSECTED.num - 1].isEdge) {
            usedObjPosition.x = planeList[INTERSECTED.num - 1].plane.position.x;
            usedObjPosition.z = planeList[INTERSECTED.num - 1].plane.position.z;
            return;
        } else {
            switch (planeList[INTERSECTED.num - 1].whichEdge) {
                case 1:
                    usedObjPosition.x = planeList[12].plane.position.x;
                    usedObjPosition.z = planeList[12].plane.position.z;
                    return;
                case 2:
                    usedObjPosition.x = planeList[INTERSECTED.num + 10].plane.position.x;
                    usedObjPosition.z = planeList[INTERSECTED.num + 10].plane.position.z;
                    return;
                case 3:
                    usedObjPosition.x = planeList[20].plane.position.x;
                    usedObjPosition.z = planeList[20].plane.position.z;
                    return;
                case 4:
                    usedObjPosition.x = planeList[INTERSECTED.num - 11].plane.position.x;
                    usedObjPosition.z = planeList[INTERSECTED.num - 11].plane.position.z;
                    return;
                case 6:
                    usedObjPosition.x = planeList[INTERSECTED.num - 2].plane.position.x;
                    usedObjPosition.z = planeList[INTERSECTED.num - 2].plane.position.z;
                    return;
                case 7:
                    usedObjPosition.x = planeList[100].plane.position.x;
                    usedObjPosition.z = planeList[100].plane.position.z;
                    return;
                case 8:
                    usedObjPosition.x = planeList[INTERSECTED.num - 12].plane.position.x;
                    usedObjPosition.z = planeList[INTERSECTED.num - 12].plane.position.z;
                    return;
                case 9:
                    usedObjPosition.x = planeList[108].plane.position.x;
                    usedObjPosition.z = planeList[108].plane.position.z;
                    return;
            }
        }
    }
}

/////////////////////////////////////////////////////////////////////////

/////////////////////////////顯示區塊計算////////////////////////////////

//顯示按下SHIFT地板陰影
function CheckUsedPlane(intersects) {
    if (intersects) { //是否選到地板
        if (intersects == null) {
            return false;
        }

        if (intersects.objType != "wall") {

            if (INTERSECTED != intersects) {
                if (INTERSECTED) {
                    setOriginColor(usedPlane)
                    setOriginColor(ChoosedPlane)
                }


                INTERSECTED = intersects;
                usedPlane = [];

                if (planeList[INTERSECTED.num - 1].GroupNum != null) {
                    setCoverColor(objGroupList[planeList[INTERSECTED.num - 1].GroupNum]);
                    usedPlane = objGroupList[planeList[INTERSECTED.num - 1].GroupNum];
                } else {
                    setOriginColor(usedPlane)
                    setOriginColor(ChoosedPlane)
                }
            }
        }
    }
    else {
        if (INTERSECTED) {
            setOriginColor(usedPlane)
            setOriginColor(ChoosedPlane)
        }
        usedPlane = [];
        INTERSECTED = null;
    }
}

//顯示 1*1 地板陰影
function planeShadow11(intersects) {
    if (intersects) { //是否選到地板
        if (intersects == null) {
            return false;
        }

        if (intersects.objType == "wall") {
            setOriginColor(usedPlane)
            usedPlane = [];
            INTERSECTED = null;
            return;
        }

        if (INTERSECTED != intersects) {
            if (INTERSECTED)
                setOriginColor(usedPlane)

            INTERSECTED = intersects;
            usedPlane = [];
            usedPlane.push(INTERSECTED.num - 1)
            setCoverColor([INTERSECTED.num - 1])
        }

    } else {
        if (INTERSECTED) {
            setOriginColor(usedPlane)
        }

        usedPlane = [];
        INTERSECTED = null;
    }
}

//顯示 2*2 地板陰影
function planeShadow22(intersects) {
    if (intersects) { //是否選到地板
        if (intersects == null) {
            return false;
        }

        if (intersects.objType == "wall") {
            setOriginColor(usedPlane)
            usedPlane = [];
            INTERSECTED = null;
            return;
        }

        if (INTERSECTED != intersects) {
            if (INTERSECTED)
                setOriginColor(usedPlane)

            INTERSECTED = intersects;
            usedPlane = [];

            //判斷要傾向四角的哪一角
            switch (INTERSECTED.privateId) {
                case 1:
                    usedPlane.push(INTERSECTED.num - 1, INTERSECTED.num - 13, INTERSECTED.num - 12, INTERSECTED.num - 2)
                    setCoverColor([INTERSECTED.num - 1, INTERSECTED.num - 13, INTERSECTED.num - 12, INTERSECTED.num - 2])
                    break;
                case 2:
                    usedPlane.push(INTERSECTED.num - 1, INTERSECTED.num, INTERSECTED.num - 12, INTERSECTED.num - 11)
                    setCoverColor([INTERSECTED.num - 1, INTERSECTED.num, INTERSECTED.num - 12, INTERSECTED.num - 11])
                    break;
                case 3:
                    usedPlane.push(INTERSECTED.num - 1, INTERSECTED.num - 2, INTERSECTED.num + 9, INTERSECTED.num + 10)
                    setCoverColor([INTERSECTED.num - 1, INTERSECTED.num - 2, INTERSECTED.num + 9, INTERSECTED.num + 10])
                    break;
                case 4:
                    usedPlane.push(INTERSECTED.num - 1, INTERSECTED.num, INTERSECTED.num + 10, INTERSECTED.num + 11)
                    setCoverColor([INTERSECTED.num - 1, INTERSECTED.num, INTERSECTED.num + 10, INTERSECTED.num + 11])
                    break;
            }
        }
    } else {
        if (INTERSECTED)
            setOriginColor(usedPlane)

        usedPlane = [];
        INTERSECTED = null;
    }
}

//顯示 3*3 地板陰影
function planeShadow33(intersects) {
    if (intersects) { //是否選到地板
        if (intersects == null) {
            return false;
        }

        if (intersects.objType == "wall") {
            setOriginColor(usedPlane)
            usedPlane = [];
            INTERSECTED = null;
            return;
        }

        if (INTERSECTED != intersects) {
            if (INTERSECTED)
                setOriginColor(usedPlane)

            INTERSECTED = intersects;
            usedPlane = [];

            if (!planeList[INTERSECTED.num - 1].isEdge) {
                usedPlane.push(INTERSECTED.num, INTERSECTED.num - 2, INTERSECTED.num - 13, INTERSECTED.num - 12, INTERSECTED.num - 11, INTERSECTED.num - 1, INTERSECTED.num + 9, INTERSECTED.num + 10, INTERSECTED.num + 11)
                setCoverColor([INTERSECTED.num, INTERSECTED.num - 2, INTERSECTED.num - 13, INTERSECTED.num - 12, INTERSECTED.num - 11, INTERSECTED.num - 1, INTERSECTED.num + 9, INTERSECTED.num + 10, INTERSECTED.num + 11])
            } else {
                switch (planeList[INTERSECTED.num - 1].whichEdge) {
                    case 1:
                        usedPlane.push(0, 1, 2, 11, 12, 13, 22, 23, 24)
                        setCoverColor([0, 1, 2, 11, 12, 13, 22, 23, 24])
                        break;
                    case 2:
                        usedPlane.push(INTERSECTED.num - 2, INTERSECTED.num - 1, INTERSECTED.num, INTERSECTED.num + 9, INTERSECTED.num + 10, INTERSECTED.num + 11, INTERSECTED.num + 20, INTERSECTED.num + 21, INTERSECTED.num + 22)
                        setCoverColor([INTERSECTED.num - 2, INTERSECTED.num - 1, INTERSECTED.num, INTERSECTED.num + 9, INTERSECTED.num + 10, INTERSECTED.num + 11, INTERSECTED.num + 20, INTERSECTED.num + 21, INTERSECTED.num + 22])
                        break;
                    case 3:
                        usedPlane.push(8, 9, 10, 19, 20, 21, 30, 31, 32)
                        setCoverColor([8, 9, 10, 19, 20, 21, 30, 31, 32])
                        break;
                    case 4:
                        usedPlane.push(INTERSECTED.num - 1, INTERSECTED.num, INTERSECTED.num + 1, INTERSECTED.num - 12, INTERSECTED.num - 11, INTERSECTED.num - 10, INTERSECTED.num + 10, INTERSECTED.num + 11, INTERSECTED.num + 12)
                        setCoverColor([INTERSECTED.num - 1, INTERSECTED.num, INTERSECTED.num + 1, INTERSECTED.num - 12, INTERSECTED.num - 11, INTERSECTED.num - 10, INTERSECTED.num + 10, INTERSECTED.num + 11, INTERSECTED.num + 12])
                        break;
                    case 6:
                        usedPlane.push(INTERSECTED.num - 3, INTERSECTED.num - 2, INTERSECTED.num - 1, INTERSECTED.num - 14, INTERSECTED.num - 13, INTERSECTED.num - 12, INTERSECTED.num + 8, INTERSECTED.num + 9, INTERSECTED.num + 10)
                        setCoverColor([INTERSECTED.num - 3, INTERSECTED.num - 2, INTERSECTED.num - 1, INTERSECTED.num - 14, INTERSECTED.num - 13, INTERSECTED.num - 12, INTERSECTED.num + 8, INTERSECTED.num + 9, INTERSECTED.num + 10])
                        break;
                    case 7:
                        usedPlane.push(88, 89, 90, 99, 100, 101, 110, 111, 112)
                        setCoverColor([88, 89, 90, 99, 100, 101, 110, 111, 112])
                        break;
                    case 8:
                        usedPlane.push(INTERSECTED.num - 2, INTERSECTED.num - 1, INTERSECTED.num, INTERSECTED.num - 13, INTERSECTED.num - 12, INTERSECTED.num - 11, INTERSECTED.num - 24, INTERSECTED.num - 23, INTERSECTED.num - 22)
                        setCoverColor([INTERSECTED.num - 2, INTERSECTED.num - 1, INTERSECTED.num, INTERSECTED.num - 13, INTERSECTED.num - 12, INTERSECTED.num - 11, INTERSECTED.num - 24, INTERSECTED.num - 23, INTERSECTED.num - 22])
                        break;
                    case 9:
                        usedPlane.push(96, 97, 98, 107, 108, 109, 118, 119, 120)
                        setCoverColor([96, 97, 98, 107, 108, 109, 118, 119, 120])
                        break;
                }
            }
        }
    } else {
        if (INTERSECTED)
            setOriginColor(usedPlane)

        usedPlane = [];
        INTERSECTED = null;
    }
}

/////////////////////////////////////////////////////////////////////////

/////////////////////////////顯示地板陰影////////////////////////////////

//增加陰影
function setCoverColor(planeNums) {
    if (INTERSECTED) {
        for (var i = 0; i < planeNums.length; i++) {
            if (isNaN(planeNums[i]))
                return;
        }

        for (var i = 0; i < planeNums.length; i++) {
            planeList[planeNums[i]].plane.material.color.set(planeList[planeNums[i]].objType != null ? 0xff0000 : 0x33FF33)
            planeList[planeNums[i]].plane.visible = true
        }
    }
}

//移除陰影
function setOriginColor(planeNums) {
    //if (INTERSECTED) {
    for (var i = 0; i < planeNums.length; i++) {
        if (isNaN(planeNums[i]))
            return;
    }

    for (var i = 0; i < planeNums.length; i++) {
        planeList[planeNums[i]].plane.visible = false
    }
    //}
}
/////////////////////////////////////////////////////////////////////////

//////////////////////////////面板點擊事件///////////////////////////////

//模型選擇事件
function ClickListItem() {

    if ($(this)[0] == oldListItem) {
        return;
    }

    var tempOldItem;

    if (typeof oldListItem != "undefined") {
        oldListItem.style.backgroundColor = oldItemColor;
        tempOldItem = oldListItem.children[0].children[1].children[0];
        //oldListItem.setAttribute("data-ischoosed", false); //設定為 未選中
        if (typeof oldListItemColor != "undefined") {
            oldListItemColor.style.border = "solid 0px #000000"
        }
    }

    oldListItem = $(this)[0];
    //oldListItem.setAttribute("data-ischoosed", true) //設定為 已選中
    //oldListItem.children[0].children[1].children[0].style.border = "solid 3px #000000"
    oldListItemColor = oldListItem.children[0].children[1].children[0];
    oldItemColor = oldListItem.style.backgroundColor;
    oldListItem.style.backgroundColor = "#91e669";

    ChangeObj($(this)[0].children[0].children[1].children[0], tempOldItem, $(this).index(), $(this).children(0).children(1).children(0).index());

}

//顏色選擇事件
function ClickListItemColor() {
    if ($(this)[0] == oldListItemColor || (typeof oldListItem == "undefined" || oldListItem != $(this).parent().parent().parent()[0]))
        return;

    var tempOldItem;

    if (typeof oldListItemColor != "undefined") {
        tempOldItem = oldListItemColor;
        oldListItemColor.style.border = "solid 0px #000000"
    }

    oldListItemColor = $(this)[0];
    //oldListItemColor.style.border = "solid 3px #000000"

    ChangeObj($(this)[0], tempOldItem, $(this).parent().parent().parent().index(), $(this).index());
}

//變更模型
function ChangeObj(colorDOM, tempOldItem, modelIndex, colorIndex) {
    var $used_tr = colorDOM.parentElement.parentElement.parentElement,
        type = $used_tr.dataset.objtype;

    isRender = false;

    if (allObjList[modelIndex][colorIndex] != null) {
        isChoosed = false;
        setOriginColor(ChoosedPlane)
        ChoosedPlane = [];
        objType = type;
        ChoosedObjType = type;
        nowObj = allObjList[modelIndex][colorIndex].clone();
        isRender = true;
        if (typeof tempOldItem != "undefined")
            tempOldItem.style.border = "solid 0px #000000";
        colorDOM.style.border = "solid 3px #000000";
        return;
    }

    var objPath = colorDOM.dataset.objpath,
         mtlPath = colorDOM.dataset.mtlpath,
         xScale = $used_tr.dataset.xscale,
         yScale = $used_tr.dataset.yscale,
         zScale = $used_tr.dataset.zscale;

    loader.load("http://" + window.location.host /*+ "/3DTest"*/ + objPath, "http://" + window.location.host/* + "/3DTest"*/ + mtlPath,
        function (object) {
            isChoosed = false;
            setOriginColor(ChoosedPlane)
            ChoosedPlane = [];
            objType = type;
            ChoosedObjType = type;
            object.scale.set(xScale, yScale, zScale);
            nowObj = object.clone();
            isRender = true;
            if (typeof tempOldItem != "undefined")
                tempOldItem.style.border = "solid 0px #000000";
            colorDOM.style.border = "solid 3px #000000";
            allObjList[modelIndex][colorIndex] = object;
        },
        function (xhr) {
            isRender = false;
            $("#mask").css("display", "block");
            $("#rotateDiv").hide();
            console.log(parseInt(xhr.loaded / xhr.total * 100) + '%')
        },
        function (xhr) {
            if (confirm("模型載入失敗!")) {
                isRender = true;
                $("#mask").css("display", "none");
            }
            tempOldItem.style.border = "solid 1px #000000";
        });

    isRender = true;
}

//變更牆壁地板風格
function ChangeStyle() {
    setOriginColor(ChoosedPlane)
    isChoosed = false;
    ChoosedPlane = [];

    switch ($(this).val()) {
        case "1": //美式
            wall1.material.map = THREE.ImageUtils.loadTexture("./image/Layout/America/america_wall_1.jpg")
            wall2.material.map = THREE.ImageUtils.loadTexture("./image/Layout/America/america_wall_2.jpg")
            basePlane.material.map = THREE.ImageUtils.loadTexture("./image/Layout/America/america_plane.jpg")
            break;
        case "2": //北歐
            wall1.material.map = THREE.ImageUtils.loadTexture("./image/Layout/Nordic/nordic_wall_1.jpg")
            wall2.material.map = THREE.ImageUtils.loadTexture("./image/Layout/Nordic/nordic_wall_2.jpg")
            basePlane.material.map = THREE.ImageUtils.loadTexture("./image/Layout/Nordic/nordic_plane.jpg")
            break;
        case "3": //日式
            wall1.material.map = THREE.ImageUtils.loadTexture("./image/Layout/Japan/japan_wall_2.jpg")
            wall2.material.map = THREE.ImageUtils.loadTexture("./image/Layout/Japan/japan_wall_1.jpg")
            basePlane.material.map = THREE.ImageUtils.loadTexture("./image/Layout/Japan/japan_plane.jpg")
            break;
        case "4": //簡約
            wall1.material.map = THREE.ImageUtils.loadTexture("./image/Layout/Simple/simple_wall_2.jpg")
            wall2.material.map = THREE.ImageUtils.loadTexture("./image/Layout/Simple/simple_wall_1.jpg")
            basePlane.material.map = THREE.ImageUtils.loadTexture("./image/Layout/Simple/simple_plane.jpg")
            break;
        case "5": //鄉村
            wall1.material.map = THREE.ImageUtils.loadTexture("./image/Layout/Country/country_wall_2.jpg")
            wall2.material.map = THREE.ImageUtils.loadTexture("./image/Layout/Country/country_wall_1.jpg")
            basePlane.material.map = THREE.ImageUtils.loadTexture("./image/Layout/Country/country_plane.jpg")
            break;
    }
}

//3D畫面截圖
function Get3DImage() {
    window.open(renderer.domElement.toDataURL('image/png'), '', "_blank,width=1280,height=900");
}

//清除畫面
function ClearAll() {
    INTERSECTED = null;
    isRender = false;
    $("#mask").css("display", "block");

    for (var i = 0; i < planeList.length; i++) {
        planeList[i].plane.visible = false;
        planeList[i].plane.material.color.set(0x33FF33);
        planeList[i].GroupNum = null;
        planeList[i].objType = null;
    }
    for (var i = 0; i < objList.length; i++) {
        scene.remove(objList[i]);
    }
    objList = [];
    for (var i = 0; i < 121; i++) {
        objList.push(null)
    }
    usedPlane = [];
    objGroupList = [];
    ChoosedPlane = [];

    isChoosed = false;
    isShiftDown = false;
    isMouseDown = false;

    isRender = true;
    $("#mask").css("display", "none");
}

//模型逆時針旋轉
function TurnLeft() {
    if (ChoosedPlane.length > 0) {
        objList[ChoosedPlane[0]].rotation.y += 45 * Math.PI / 180;
    }
    $("#rotateDiv").show();
}

//模型順時針旋轉
function TurnRight() {
    if (ChoosedPlane.length > 0) {
        objList[ChoosedPlane[0]].rotation.y += -45 * Math.PI / 180;
    }
    $("#rotateDiv").show();
}
/////////////////////////////////////////////////////////////////////////