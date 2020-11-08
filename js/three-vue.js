window.onload = function(){
	//タッチイベントが利用可能かどうかの判別
	var supportTouch = 'ontouchend' in document;
	//イベント名の決定
	const EVENTNAME_START = supportTouch? 'touchstart':'mousedown';
	const EVENTNAME_MOVE = supportTouch? 'touchmove':'mousemove';
	const EVENTNAME_END = supportTouch? 'touchend':'mouseup';

	//var el_myCanvas = document.getElementById('myCanvas');
	//var clientRect = el_myCanvas.getBoundingClientRect();

	//↓　x,y座標の基準点を決める
	//ページの左端から要素の左端までの距離
	//var positionX = clientRect.left + clientRect.width/2 + window.pageXOffset ;
	//ページの上端から要素の上端までの距離
	//var positionY = clientRect.top + clientRect.height/2 + window.pageYOffset ;

  // Get a reference to the database service
  var database = firebase.database();

	//Vueインスタンスが存在するかどうかを判別するフラグ
	var first = true;

	//
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
					mouse : new THREE.Vector2(),
					mouse_positonX_holder: 0,
					mouse_positonY_holder: 0,
					raycaster : new THREE.Raycaster(),
					intersects : 0,
					drag_vertices_num: 0,
					//touch操作関連
					pointX: 0,
					pointY: 0,
					myText: '画面をタッチしてください',
					OrbitTXT:'OrbitControlをオンにする',
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

							this.raycaster.setFromCamera(this.mouse, this.camera);
							this.intersects = this.raycaster.intersectObjects(this.scene.children);

						}else if(this.eventstart == 'mousedown'){

							this.raycaster.setFromCamera(this.mouse, this.camera);
							this.intersects = this.raycaster.intersectObjects(this.scene.children);

						};
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
								//console.log(distance);

								//最寄りの頂点をドラッグ候補とする
								if(distance < drag_vertices_dis){
									drag_vertices_dis = distance;
									this.drag_vertices_num = i;
								}
							}
							//ドラッグ候補が見つかった時にイベントリスナー追加、マウスの移動を追う
							if(drag_vertices_dis < 100){
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

						}else if(this.eventmove == 'mousemove'){
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
						};
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
							if(this.eventmove == 'mousemove'){
								this.canvas.removeEventListener(this.eventmove,this.handleEventmove);
							}
							this.canvas.removeEventListener(this.eventstart,this.handleStart);

							this.controls.enabled = true;
							this.canvas.addEventListener(this.eventstart,this.OrbitStart,{passive:false});
							this.OrbitTXT = 'OrbitControlをオフにする';
						}else{
							if(this.eventmove == 'mousemove'){
								this.canvas.addEventListener(this.eventmove, this.handleEventmove);
							}
							this.canvas.addEventListener(this.eventstart,this.handleStart,{passive:false});

							this.controls.enabled = false;
							this.canvas.removeEventListener(this.eventstart,this.OrbitStart);
							this.OrbitTXT = 'OrbitControlをオンにする';
						}
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



	//コールバック関数を用いて、データベースからの読み込みを待つ
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
