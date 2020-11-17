window.onload = function(){
	//タッチイベントが利用可能かどうかの判別
	var supportTouch = 'ontouchend' in document;
	//イベント名の決定
	const EVENTNAME_START = supportTouch? 'touchstart':'mousedown';
	const EVENTNAME_MOVE = supportTouch? 'touchmove':'mousemove';
	const EVENTNAME_END = supportTouch? 'touchend':'mouseup';

  // Get a reference to the database service
  var database = firebase.database();

	//Vueインスタンスが存在するかどうかを判別するフラグ
	var first = true;

	//更新内容を一時保存する変数
	var updates = {};


	function renewDB(update_set){
		//update_setは、行われたDOM操作に関して記録したリストとする
		console.log("DB update");
		database.ref("/user1").update(update_set);
		//updatesを初期化
		updates = {};
	};

	//Vueインスタンスをいれる変数
	//インスタンス外部からメソッドを呼ぶのに利用する
	var vm;

	function createV(fss){

		vm = new Vue({
				el:"#app",
				data: {
					//three.js関連
					canvas : 0,
					scene : new THREE.Scene(),
					renderer : new THREE.WebGLRenderer({antialias: true}),
					camera :  new THREE.PerspectiveCamera(45,1,1,10000),
					controls : 0,
					light : new THREE.DirectionalLight(0xFFFFFF, 1),
					geometry : new THREE.BoxGeometry(fss.child("width").val(),
																						fss.child("height").val(),
																						fss.child("depth").val()),
					material : new THREE.MeshNormalMaterial(),
					cube : 0,
					//頂点操作
					mouse : new THREE.Vector2(),
					mouse_positonX_holder: 0,
					mouse_positonY_holder: 0,
					raycaster : new THREE.Raycaster(),
					intersects : 0,
					drag_vertices_num: 0,
					//ピボット操作
					wrap: new THREE.Group(),
					pivot_position:{	//実際はDBから定義する
						x:200,
						y:100,
						z:-200
					},
					Obj_Position_Holder:{ //ピボット操作の間オブジェクトの位置を保持
						x:0,
						y:0,
						z:0
					},
					pivot_handler_geo:new THREE.Geometry(),
					pivot_handler_mat:new THREE.PointsMaterial({
																														size:30,
																														color:0xFFFFFF,
																													}),
					pivot_handler: 0,							//ピボットの可視化用
					//touch操作関連
					pointX: 0,
					pointY: 0,
					myText: '画面をタッチしてください',
					OrbitTXT:'OrbitControlをオンにする',
					PivotTXT:'ピボット操作オン',
					bgcolor: 'lightblue',
					eventstart: EVENTNAME_START,
					eventmove: EVENTNAME_MOVE,
					eventend: EVENTNAME_END
				},
				methods:{
					handleStart:function(e){
						e.preventDefault();
						if(this.eventstart == 'touchstart'){
							this.handleEventmoveForTablet();

						}else if(this.eventstart == 'mousedown'){

						};
						this.raycaster.setFromCamera(this.mouse, this.camera);
						this.intersects = this.raycaster.intersectObjects(this.scene.children);
						//クリック時、オブジェクトを検知すると以下を実行
						if(this.intersects.length > 0){
							console.log("finded intersect");
							this.bgcolor = 'orange';
							this.myText = 'タッチ中';
							//クリック時のcanvas上でのxy座標を保持（頂点移動距離の計算に使う）
							this.mouse_positonX_holder = this.mouse.x;
							this.mouse_positonY_holder = this.mouse.y;

							var drag_vertices_dis = 100;
							//前頂点から最寄りの頂点を探す
							for(let i = 0;i < 8;i++){
								var distance = Math.sqrt(
									Math.pow(this.intersects[0].point.x-this.cube.geometry.vertices[i].x,2)
									+Math.pow(this.intersects[0].point.y-this.cube.geometry.vertices[i].y,2)
									+Math.pow(this.intersects[0].point.z-this.cube.geometry.vertices[i].z,2)
								);

								//最寄りの頂点をドラッグ候補とする
								if(distance < drag_vertices_dis){
									drag_vertices_dis = distance;
									this.drag_vertices_num = i;
									var num = i;
								}
							}
							//ドラッグ候補が見つかった時にイベントリスナー追加、マウスの移動を追う
							if(drag_vertices_dis < 100){
								console.log(num);
								console.log("catch:"+this.drag_vertices_num);
								this.canvas.addEventListener(this.eventmove,this.handleVerticesMove,{passive:false});
								this.canvas.addEventListener(this.eventend,this.handleVerticesEnd);
							}
						}else{
							console.log("Did not find intersects");
						};
					},


					handleVerticesMove:function(e){
						e.preventDefault();
						if(this.eventmove == 'touchmove'){
							this.handleEventmoveForTablet();

						}else if(this.eventmove == 'mousemove'){

						};

						//マウスの移動距離を求める 100はバッファ
						var mouse_moving_disX = 100*(this.mouse.x - this.mouse_positonX_holder);
						this.mouse_positonX_holder = this.mouse.x;
						var mouse_moving_disY = 100*(this.mouse.y - this.mouse_positonY_holder);
						this.mouse_positonY_holder = this.mouse.y;

						//頂点座標の移動距離を求めてsetする
						this.$set(this.cube.geometry.vertices[this.drag_vertices_num],'x',
							this.cube.geometry.vertices[this.drag_vertices_num].x +
							mouse_moving_disX *
							Math.cos(this.controls.getAzimuthalAngle()));
						this.$set(this.cube.geometry.vertices[this.drag_vertices_num],'y',
							this.cube.geometry.vertices[this.drag_vertices_num].y +
							mouse_moving_disY *
							Math.cos(Math.PI/2 - this.controls.getPolarAngle()));
						this.$set(this.cube.geometry.vertices[this.drag_vertices_num],'z',
							this.cube.geometry.vertices[this.drag_vertices_num].z +
							(-1) * (mouse_moving_disX) *
							Math.sin(this.controls.getAzimuthalAngle()) +
							(-1) * (mouse_moving_disY) *
							Math.sin(Math.PI/2 - this.controls.getPolarAngle()));

						this.$nextTick(function(){
							this.geometry.verticesNeedUpdate = true;
							this.animate();
						});
					},


					handleVerticesEnd:function(e){
						this.bgcolor = 'lightblue';
						this.myText = '画面を触って';
						this.pointX = 0;
						this.pointY = 0;
						//更新内容をVueメソッドhandleEnd()内でupdates[]に定義
						updates['vertices/'+this.drag_vertices_num+'/x'] =
							this.cube.geometry.vertices[this.drag_vertices_num].x;
						updates['vertices/'+this.drag_vertices_num+'/y'] =
							this.cube.geometry.vertices[this.drag_vertices_num].y;
						updates['vertices/'+this.drag_vertices_num+'/z'] =
							this.cube.geometry.vertices[this.drag_vertices_num].z;

						//DB更新の関数を呼ぶ
						renewDB(updates);

						//イベントリスナーを削除
						this.canvas.removeEventListener(this.eventmove,this.handleVerticesMove);
						this.canvas.removeEventListener(this.eventend,this.handleVerticesEnd);

					},


					//データベースが更新されたときにそのデータを元にシーンを変更
					changed_DB_bySomeone:function(ss){
						console.log("from changed_DB_bySomeone");
						//DbのデータからTHREEシーンを更新
						//メッシュに対してスナップショットから頂点座標を設定
						for(let i = 0;i < 8;i++){
							this.$set(this.cube.geometry.vertices[i],'x',ss.child("vertices/"+i+"/x").val());
							this.$set(this.cube.geometry.vertices[i],'y',ss.child("vertices/"+i+"/y").val());
							this.$set(this.cube.geometry.vertices[i],'z',ss.child("vertices/"+i+"/z").val());
						};
						this.$nextTick(function(){
							this.geometry.verticesNeedUpdate = true;
							this.animate();
						});
					},


					//描画更新が必要なときに呼び出されるメソッド
					animate:function(){
						this.renderer.render(this.scene,this.camera);
						console.log("render!");
					},

					//mouseのXY座標を計算する関数(PC専用)
					//スマホの場合は随時後者を呼び、イベント連動しながら計算するように設定
					handleEventmove:function(event){

						const element = event.currentTarget;
						const x = event.clientX - element.offsetLeft;
						const y = event.clientY - element.offsetTop;
						const w = element.offsetWidth;
						const h = element.offsetHeight;
						this.mouse.x = (x/w)*2-1;
						this.mouse.y = -(y/h)*2+1;

						//マウスのxy座標(canvas上[-1 ~ 1])
						this.pointX = this.mouse.x;
						this.pointY = this.mouse.y;

					},
					handleEventmoveForTablet:function(){
						const element = event.currentTarget;
						const x = event.touches[0].clientX - element.offsetLeft;
						const y = event.touches[0].clientY - element.offsetTop;
						const w = element.offsetWidth;
						const h = element.offsetHeight;
						this.mouse.x = (x/w)*2-1;
						this.mouse.y = -(y/h)*2+1;

						//マウスのxy座標(canvas上[-1 ~ 1])
						this.pointX = this.mouse.x;
						this.pointY = this.mouse.y;
					},


					//Orbit操作に対して描画を更新するためのメソッド
					OrbitStart:function(e){
						e.preventDefault();
						this.canvas.addEventListener(this.eventmove,this.OrbitMove);
						this.canvas.addEventListener(this.eventend,this.OrbitEnd);
					},
					OrbitMove:function(e){
						this.controls.update();
						this.animate();
					},
					OrbitEnd:function(e){
						this.canvas.removeEventListener(this.eventmove,this.OrbitMove);
						this.canvas.removeEventListener(this.eventend,this.OrbitEnd);
					},

					Orbitbtn:function(){
						if(this.OrbitTXT == 'OrbitControlをオンにする'){
							this.myText = 'カメラ操作開始';
							//カメラ操作のイベントリスナー追加
							this.controls.enabled = true;
							this.canvas.addEventListener(this.eventstart,this.OrbitStart,{passive:false});
							//イベントリスナー削除
							if(this.eventmove == 'mousemove'){
								this.canvas.removeEventListener(this.eventmove,this.handleEventmove);
							}
							this.canvas.removeEventListener(this.eventstart,this.handleStart);
							this.canvas.removeEventListener(this.eventstart,this.handlePivotStart);
							this.OrbitTXT = 'OrbitControlをオフにする';
							this.PivotTXT = 'ピボット操作オン';
						}else{
							//イベントリスナー削除
							this.controls.enabled = false;
							this.canvas.removeEventListener(this.eventstart,this.OrbitStart);
							//頂点操作のイベントリスナー追加
							if(this.eventmove == 'mousemove'){
								this.canvas.addEventListener(this.eventmove, this.handleEventmove);
							}
							this.canvas.addEventListener(this.eventstart,this.handleStart,{passive:false});
							//THREE.JSシーンからgroupを削除し、meshをaddする
							this.scene.remove(this.wrap);
							this.cube.position.set(this.Obj_Position_Holder.x,
																			this.Obj_Position_Holder.y,
																			this.Obj_Position_Holder.z);
							this.scene.add(this.cube);
							this.renderer.render(this.scene, this.camera);


							this.OrbitTXT = 'OrbitControlをオンにする';
							this.myText = '頂点操作オン';
						}
					},

					Pivotbtn:function(){
						if(this.PivotTXT == 'ピボット操作オン'){
							this.myText = 'ピボット操作開始';
							//ピボット操作のイベントリスナー追加
							this.canvas.addEventListener(this.eventstart,this.handlePivotStart,{passive:false});
							if(this.eventmove == 'mousemove'){
								this.canvas.addEventListener(this.eventmove, this.handleEventmove);
							};
							//THREE.JSシーンからmeshを削除し、groupをaddする
							this.scene.remove(this.cube);
							this.wrap.add(this.cube);

							this.cube.position.set(this.Obj_Position_Holder.x-this.wrap.position.x,
																			this.Obj_Position_Holder.y-this.wrap.position.y,
																			this.Obj_Position_Holder.z-this.wrap.position.z);
							this.scene.add(this.wrap);
							this.renderer.render(this.scene, this.camera);

							//イベントリスナー削除
							//if(this.eventmove == 'mousemove'){
							//	this.canvas.removeEventListener(this.eventmove,this.handleEventmove);
							//}
							this.canvas.removeEventListener(this.eventstart,this.handleStart);
							this.controls.enabled = false;
							this.canvas.removeEventListener(this.eventstart,this.OrbitStart);


							this.OrbitTXT = 'OrbitControlをオンにする';
							this.PivotTXT = 'ピボット操作オフ';
						}else{
							//イベントリスナー削除
							this.canvas.removeEventListener(this.eventstart,this.handlePivotStart);
							//頂点操作のイベントリスナー追加
							//if(this.eventmove == 'mousemove'){
							//	this.canvas.addEventListener(this.eventmove, this.handleEventmove);
							//};
							this.canvas.addEventListener(this.eventstart,this.handleStart,{passive:false});
							//THREE.JSシーンからgroupを削除し、meshをaddする
							this.scene.remove(this.wrap);
							this.cube.position.set(this.Obj_Position_Holder.x,
																			this.Obj_Position_Holder.y,
																			this.Obj_Position_Holder.z);
							this.scene.add(this.cube);
							this.renderer.render(this.scene, this.camera);


							this.PivotTXT = 'ピボット操作オン';
							this.myText = '頂点操作オン';
						}
					},

					handlePivotStart:function(e){
						e.preventDefault();
						if(this.eventstart == 'touchstart'){
							this.handleEventmoveForTablet();

						}else if(this.eventstart == 'mousedown'){

						};
						//クリック時のcanvas上でのxy座標を保持（頂点移動距離の計算に使う）
						this.mouse_positonX_holder = this.mouse.x;
						this.mouse_positonY_holder = this.mouse.y;

						//クリックしたオブジェクトのピボット位置に目印となるオブジェクトを配置
						//raycasterを用いてオブジェクトを特定(未実装)
						this.scene.add(this.pivot_handler);

						this.canvas.addEventListener(this.eventmove,this.handlePivotMove,{passive:false});
						this.canvas.addEventListener(this.eventend,this.handlePivotEnd,{passive:false});
						this.$nextTick(function(){
							this.animate();
						});
					},
					handlePivotMove:function(e){
						e.preventDefault();
						if(this.eventmove == 'touchmove'){
							this.handleEventmoveForTablet();

						}else if(this.eventmove == 'mousemove'){

						};
						//ユーザーの操作に応じて「目印」を動かす
						//this.pivot_handler.geometry.vertices[0].x += 0.1;確認用

						//マウスの移動距離を求める 100はバッファ
						var mouse_moving_disX = 200*(this.mouse.x - this.mouse_positonX_holder);
						this.mouse_positonX_holder = this.mouse.x;
						var mouse_moving_disY = 200*(this.mouse.y - this.mouse_positonY_holder);
						this.mouse_positonY_holder = this.mouse.y;

						//ピボット座標の移動距離を求めてsetする
						this.$set(this.pivot_handler.geometry.vertices[0],'x',
							this.pivot_handler.geometry.vertices[0].x +
							mouse_moving_disX *
							Math.cos(this.controls.getAzimuthalAngle()));

						this.$set(this.pivot_handler.geometry.vertices[0],'y',
							this.pivot_handler.geometry.vertices[0].y +
							mouse_moving_disY *
							Math.cos(Math.PI/2 - this.controls.getPolarAngle()));

						this.$set(this.pivot_handler.geometry.vertices[0],'z',
							this.pivot_handler.geometry.vertices[0].z +
							(-1) * (mouse_moving_disX) *
							Math.sin(this.controls.getAzimuthalAngle()) +
							(-1) * (mouse_moving_disY) *
							Math.sin(Math.PI/2 - this.controls.getPolarAngle()));


						this.$nextTick(function(){
							this.pivot_handler.geometry.verticesNeedUpdate = true;
							this.animate();
						});
					},
					handlePivotEnd:function(e){
						e.preventDefault();
						//移動後のピボット位置にwrap(group)の位置を合わせ、wrap内でのcubeの位置を調整
						this.wrap.position.set(this.pivot_handler.geometry.vertices[0].x,
																		this.pivot_handler.geometry.vertices[0].y,
																		this.pivot_handler.geometry.vertices[0].z);
						this.cube.position.set(this.Obj_Position_Holder.x-this.wrap.position.x,
																		this.Obj_Position_Holder.y-this.wrap.position.y,
																		this.Obj_Position_Holder.z-this.wrap.position.z);

						//目印を画面から削除する
						this.scene.remove(this.pivot_handler);

						//DBのpositionデータを更新する


						this.canvas.removeEventListener(this.eventmove,this.handlePivotMove);
						this.canvas.removeEventListener(this.eventend,this.handlePivotEnd);
						this.$nextTick(function(){
							this.animate();
						});
					},

					Rotatebtn:function(){ //現在のピボットを元にy軸方向に一回転させる

					}

				},
				mounted() {
					//three.jsシーンで使うcameraやrenderの設定
					this.canvas = document.getElementById('myCanvas');
					this.canvas.appendChild(this.renderer.domElement);
					this.renderer.setPixelRatio(window.devicePixelRatio);
					this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
					this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
					this.camera.position.z = 1000;
					this.camera.lookAt(new THREE.Vector3(0,0,0));
					//axisHelperを表示
					var axisHelper = new THREE.AxisHelper(1000);  // 引数は 軸のサイズ
    			this.scene.add(axisHelper);

					//イベントの設定
					//raycaster用のmouse座標はスマホとPCで取得方法が違う
					if(this.eventmove == 'mousemove'){
						this.canvas.addEventListener(this.eventmove, this.handleEventmove);
					}
					this.canvas.addEventListener(this.eventstart,this.handleStart,{passive: false});

					//OrbitControlの設定(最初はオフ)
					this.controls = new THREE.OrbitControls(this.camera);
					this.controls.enableZoom = false;
					this.controls.enabled = false;

					//メッシュの生成
					this.cube = new THREE.Mesh(this.geometry,this.material);
					//cubeの本来の位置を保持(cubeのpositionが変わる毎に更新)
					this.Obj_Position_Holder.x = this.cube.position.x;
					this.Obj_Position_Holder.y = this.cube.position.y;
					this.Obj_Position_Holder.z = this.cube.position.z;

					//メッシュグループの位置を設定
					this.wrap.position.set(this.pivot_position.x,
																	this.pivot_position.y,
																	this.pivot_position.z);

					//ピボット操作時の目印を作成
					this.pivot_handler_geo.vertices.push(
						new THREE.Vector3(this.pivot_position.x,
																this.pivot_position.y,
																this.pivot_position.z)
					);

					this.pivot_handler = new THREE.Points(this.pivot_handler_geo,
																									this.pivot_handler_mat);
					//console.log(this.pivot_handler.position);

					//メッシュに対してスナップショットから頂点座標を設定
					for(let i = 0;i < 8;i++){
						this.$set(this.cube.geometry.vertices[i],'x',fss.child("vertices/"+i+"/x").val());
						this.$set(this.cube.geometry.vertices[i],'y',fss.child("vertices/"+i+"/y").val());
						this.$set(this.cube.geometry.vertices[i],'z',fss.child("vertices/"+i+"/z").val());
					};

					this.scene.add(this.camera);
					this.scene.add(this.light);
					this.scene.add(this.cube);

					this.renderer.render(this.scene, this.camera);
				}
		});
	};
	//Vueインスタンスを生成する関数　終


	function waitRTDBload(){
		database.ref('/user1').on('value',function(snapshot) {
			//この時snapshotにデータリストが返されている
			if(!first){
				vm.changed_DB_bySomeone(snapshot);
			}else{
				createV(snapshot);
				first = false;
			}
		});
	};


	waitRTDBload();


};
