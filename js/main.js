// JavaScript Document
/// <reference path="http://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js" />

$(document).ready(function () {

	var cutoff = 155;	// 二値化閾値
	var openningItr = 0; // オープニング反復回数
	var scale=0.5;

	// キャンバスコンテキストの取得
	var canvas=$("canvas");
	var context=[];
	for(var i=0; i<canvas.length; ++i) {
		context.push(canvas.get(i).getContext("2d"));
	}
	var canvasWidth=canvas.width();
	var canvasHeight=canvas.height();

	// 二値化閾値スライダーの初期化
	$("#imgThresioldSlider").slider({
		min: 0, max: 256, step: 1, value: cutoff,
		slide: function (event, ui) {
			cutoff = ui.value;
			document.getElementById('imgThresioldSpan').innerHTML = cutoff;
			// 二値化
			binarization(context[1], context[2], canvasWidth, canvasHeight, cutoff);
		},
		change: function (event, ui) {
			// オープニング（平滑化）
			openning(context[2], context[3], canvasWidth, canvasHeight, openningItr);
			// 輪郭追跡結果
			contourDetection(context[3], context[4], canvasWidth, canvasHeight);
		}
	});
	document.getElementById('imgThresioldSpan').innerHTML=cutoff;

	// オープニング反復回数スライダーの初期化
	$("#openningItrSlider").slider({
		min: 0, max: 5, step: 1, value: openningItr,
		slide: function (event, ui) {
			openningItr = ui.value;
			document.getElementById('openningItrSpan').innerHTML = openningItr;
			// オープニング（平滑化）
			openning(context[2], context[3], canvasWidth, canvasHeight, openningItr);
		},
		change: function (event, ui) {
			// 輪郭追跡結果
			contourDetection(context[3], context[4], canvasWidth, canvasHeight);
		}
	});
	document.getElementById('openningItrSpan').innerHTML = openningItr;

	// 画像読み込み
	var img = new Image();
	//img.src = "img/Lenna.png";
	//img.src = "img/sd20_lie-down.png";
	img.src = "img/pronama-chan.png";
	//img.src = "img/sd06.png";
	//img.src="img/miku.png";
	//img.src="img/hatyune.png";


	// 画像読み込み完了後、画像処理を実行
	// 読み込んだ画像は 幅が300 px で描画されるように調整
	img.onload=function () {
		scale=400/img.width;
		canvasWidth = Math.floor(scale * img.width);
		canvasHeight = Math.floor(scale * img.height);
		for(var i = 0; i < canvas.length; ++i) {
			canvas.attr("width", canvasWidth);
			canvas.attr("height", canvasHeight);
		}
		// 入力画像の描画
		context[0].drawImage(img, 0, 0, canvasWidth, canvasHeight);
		// グレースケール化
		grayScale(context[0], context[1], canvasWidth, canvasHeight);
		// 二値化
		binarization(context[1], context[2], canvasWidth, canvasHeight, cutoff);
		// オープニング（平滑化）
		openning(context[2], context[3], canvasWidth, canvasHeight, openningItr);
		// 輪郭追跡結果
		contourDetection(context[3], context[4], canvasWidth, canvasHeight);
	}

	img.onerror=function(){
		alert("画像が読み込めません");
	}

} );


// グレースケール化
// canvasコンテキスト contextIn をグレースケール化して contextOut に書き出す
// ただしアルファ値が 0 のピクセルはそのままにする
function grayScale(contextIn, contextOut, width, height) {
	var imgData = contextIn.getImageData(0, 0, width, height);
	var gray;
	for(var i=0; i<imgData.width*imgData.height; ++i) {
		if(imgData.data[4*i+3]!=0) {
			gray = 0.299*imgData.data[4*i]+0.587*imgData.data[4*i+1]+0.114*imgData.data[4*i+2];
			gray = Math.floor(gray);
			imgData.data[4*i] = gray;
			imgData.data[4*i+1] = gray;
			imgData.data[4*i+2] = gray;
			imgData.data[4*i+3] = 255;
		}
	}
	contextOut.putImageData(imgData, 0, 0);
}

// 二値化
// canvasコンテキスト contextIn を閾値 threshold の元で二値化して contextOut に書き出す
// 入力画像はグレースケール画像であることを想定している（RGB値がすべて同じ）
// アルファ値が 0 のピクセルは閾値に関わらず白にする
function binarization(contextIn, contextOut, width, height, threshold) {
	var imgData = contextIn.getImageData(0, 0, width, height);
	var gray;
	for(var i=0; i<imgData.width*imgData.height; ++i) {
		if(imgData.data[4*i+3]==0) {
			imgData.data[4*i] = 255;
			imgData.data[4*i+1] = 255;
			imgData.data[4*i+2] = 255;
			imgData.data[4*i+3] = 255;
		} else if(imgData.data[4*i]<threshold) {
			imgData.data[4*i] = 0;
			imgData.data[4*i+1] = 0;
			imgData.data[4*i+2] = 0;
			imgData.data[4*i+3] = 255;
		} else {
			imgData.data[4*i] = 255;
			imgData.data[4*i+1] = 255;
			imgData.data[4*i+2] = 255;
			imgData.data[4*i+3] = 255;
		}
	}
	contextOut.putImageData(imgData, 0, 0);
}

// オープニング
// canvasコンテキスト contextIn に対し numIteration 回の反復によるオープニング処理を行い contextOut に書き出す
// 入力画像は二値化画像であることを想定している（RGB値がすべて同じで、その値が 255 か 0）
function openning(contextIn, contextOut, width, height, numIteration){
	var imgData = contextIn.getImageData(0, 0, width, height);
	// 収縮
	for(var i=0; i<numIteration; ++i) {
		erosion(imgData);
	}
	// 膨張
	for(var i = 0; i < numIteration; ++i) {
		dilation(imgData);
	}
	contextOut.putImageData(imgData, 0, 0);
}


// 輪郭追跡を行い，輪郭部のみに色を出力する
function contourDetection(contextIn, contextOut, width, height) {
	var imgData=contextIn.getImageData(0, 0, width, height);
	// 読み取り用ピクセルデータ（書き換えない）
	var pixelData = new Array(width);
	for(var i=0; i<width; ++i) {
		pixelData[i] = new Array(height);
		for(var j=0; j<height; ++j) {
			pixelData[i][j] = imgData.data[4*(width*j+i)];
		}
	}
	// 更新用ピクセルデータ
	var buf=new Array(width);
	for(var i=0; i<width; ++i) {
		buf[i] = new Array(height);
		for(var j=0; j<height; ++j) {
			buf[i][j] = 255;
		}
	}

	// あるピクセルを * で表し、
	// 周囲のピクセルを下のように番号を付けて表す
	// 3 2 1
	// 4 * 0
	// 5 6 7 
	var nextCode=[7, 7, 1, 1, 3, 3, 5, 5];
	// Freeman's chain code
	var chainCode=[
		[1, 0], [1, -1], [0, -1], [-1, -1],
		[-1, 0], [-1, 1], [0, 1], [1, 1]
	];

	var rel;	// relativee pisition
	var relBuf;	// previous rel
	var dPx = [];	// detected pixel 輪郭として検出されたピクセルのテンポラリー変数
	var startPx = [];	// 輪郭追跡の開始ピクセル
	var sPx = [];	// searching pixel
	var isClosed = false;	// 輪郭が閉じていれば true
	var isStandAlone;	// 孤立点ならば true
	var pxs=[];	// 輪郭のピクセル座標の配列を格納するテンポラリー配列
	var boundaryPxs=[];	// 複数の輪郭を格納する配列
	var pxVal;	// 着目するピクセルの色
	var duplicatedPx = [];	// 複数回、輪郭として検出されたピクセル座標を格納（将来的にこのような重複を許さないアルゴリズムにしたい）
	while(1) {
		// 輪郭追跡開始ピクセルを探す
		dPx = searchStartPixel();
		// 画像全体が検索された場合はループを終了
		if(dPx[0]==width && dPx[1]==height) {
			break;
		}
		pxs=[];
		pxs.push([dPx[0], dPx[1]]);
		startPx=[dPx[0], dPx[1]];
		isStandAlone=false;
		isClosed=false;
		relBuf=5;	// 最初に調べるのは5番
		// 輪郭が閉じるまで次々に周囲のピクセルを調べる
		while(!isClosed){
			for(var i=0; i<8; ++i) {
				rel = (relBuf+i)%8;	// relBufから順に調べる
				sPx[0] = dPx[0]+chainCode[rel][0];
				sPx[1] = dPx[1]+chainCode[rel][1];
				// sPx が画像上の座標外ならば白として評価する
				if(sPx[0]<0 || sPx[0]>=width || sPx[1]<0 || sPx[1]>=height){
					pxVal = 255;
				} else {
					pxVal = pixelData[sPx[0]][sPx[1]]
				}
				// もし調べるピクセルの色が黒ならば新しい輪郭とみなす
				// 最初のピクセルに戻れば次の輪郭を探す
				// 周囲の8ピクセルがすべて白ならば孤立点なので次の輪郭を探す
				if(pxVal==0) {
					if(buf[sPx[0]][sPx[1]]==0) {
						duplicatedPx.push([sPx[0],sPx[1]]);
					}
					// 検出されたピクセルが輪郭追跡開始ピクセルならば
					// 追跡を終了して次の輪郭に移る
					if(sPx[0]==startPx[0] && sPx[1]==startPx[1]) {
						isClosed=true;
						break;
					}
					buf[sPx[0]][sPx[1]]=0;	// 検出された点を黒にする
					dPx[0]=sPx[0];
					dPx[1]=sPx[1];
					pxs.push([dPx[0], dPx[1]]);
					relBuf=nextCode[rel];
					break;
				}
				if(i==7) {
					isStandAlone = true;
				}
			}
			if(isStandAlone) {
				break;
			}
		}
		boundaryPxs.push(pxs);
	}

	// 左上から操作し開始点（白から黒に代わるピクセル）を見つける
	function searchStartPixel() {
		var idx;
		var x, y;
		var leftPx;
		for(y=0; y<height; ++y) {
			for(x=0; x<width; ++x) {
				if(x==0) {
					leftPx = 255;
				} else {
					leftPx=pixelData[x-1][y];
				}
				if(leftPx == 255 && pixelData[x][y] == 0 && buf[x][y]==255) {
					buf[x][y]=0;
					return [x, y];
				}
			}
		}
		return [width, height];
	}

	// bufの可視化をしたいとき下のコメントアウトをはずす
	/*
	for(var i=0; i<height; ++i) {
		for(var j=0; j<width; ++j) {
			idx=width*i+j;
			imgData.data[4*idx]=buf[j][i];
			imgData.data[4*idx+1]=buf[j][i];
			imgData.data[4*idx+2]=buf[j][i];
		}
	}

	for(var i=0; i<duplicatedPx.length; ++i) {
		idx=width*duplicatedPx[i][1]+duplicatedPx[i][0];
		imgData.data[4*idx]=255;
		imgData.data[4*idx+1]=0;
		imgData.data[4*idx+2]=0;
	}
	contextOut.putImageData(imgData, 0, 0);
	*/

	// 輪郭ごとに色を変えて描画する
	contextOut.clearRect(0,0,width,height);
	colors = ['red', 'green', 'blue', 'orange', 'purple', 'cyan'];
	for(var i=0; i<boundaryPxs.length; ++i) {
		contextOut.strokeStyle=colors[i%colors.length];
		contextOut.beginPath();
		contextOut.moveTo(boundaryPxs[i][0][0], boundaryPxs[i][0][1]);
		for(var j=1; j<boundaryPxs[i].length; ++j) {
			contextOut.lineTo(boundaryPxs[i][j][0], boundaryPxs[i][j][1]);
		}
		contextOut.lineTo(boundaryPxs[i][0][0], boundaryPxs[i][0][1]);
		contextOut.stroke();
	}
	contextOut.strokeStyle='black';
}


// 白を縮小
function erosion(imgData) {
	var width = imgData.width;
	var height = imgData.height;
	var pixelData = new Array(width);	// 読み取り用ピクセルデータ
	for(var i=0; i<width; ++i){
		pixelData[i] = new Array(height);
		for(var j=0; j<height; ++j) {
			pixelData[i][j] = imgData.data[4*(width*j+i)];
		}
	}
	var buf=new Array(width);	// 更新用ピクセルデータ
	for(var i=0; i<width; ++i) {
		buf[i]=new Array(height);
		for(var j=0; j<height; ++j) {
			buf[i][j]=pixelData[i][j];
		}
	}
	// 縮小処理
	var isAdjacentToBlack, x, y;
	var selectAry = [[1, 0], [0, 1], [-1, 0], [0, -1]];
	for(var i=0; i<width; ++i){
		for(var j = 0; j < height; ++j) {
			// pixel が黒なら飛ばす
			if(pixelData[i][j]==0) {
				continue;
			}
			isAdjacentToBlack = false;
			for(var k=0; k<4; ++k) {
				x=i+selectAry[k][0];
				y=j+selectAry[k][1];
				if(x>=0 && x<width && y>=0 && y<height){
					if(pixelData[x][y]==0) {
						isAdjacentToBlack=true;
						break;
					}
				}
				if(isAdjacentToBlack) {
					break;
				}
			}
			if(isAdjacentToBlack) {
				buf[i][j]=0;
			}
		}
	}
	// 結果をコピー
	var idx;
	for(var i=0; i<height; ++i) {
		for(var j=0; j<width; ++j) {
			idx=width*i+j;
			imgData.data[4*idx]=buf[j][i];
			imgData.data[4*idx+1]=buf[j][i];
			imgData.data[4*idx+2]=buf[j][i];
		}
	}
}



// 白を膨張
function dilation(imgData) {
	var width=imgData.width;
	var height=imgData.height;
	var pixelData=new Array(width);	// 読み取り用ピクセルデータ
	for(var i=0; i<width; ++i) {
		pixelData[i]=new Array(height);
		for(var j=0; j<height; ++j) {
			pixelData[i][j]=imgData.data[4*(width*j+i)];
		}
	}
	var buf = new Array(width);	// 更新用ピクセルデータ
	for(var i=0; i<width; ++i) {
		buf[i] = new Array(height);
		for(var j=0; j<height; ++j) {
			buf[i][j] = pixelData[i][j];
		}
	}
	// 膨張処理
	var x, y;
	var selectAry=[[1, 0], [0, 1], [-1, 0], [0, -1]];
	for(var i=0; i<width; ++i) {
		for(var j=0; j<height; ++j) {
			if(pixelData[i][j] == 255) {
				for(var k=0; k<4; ++k) {
					x=i+selectAry[k][0];
					y=j+selectAry[k][1];
					if(x>=0 && x<width && y>=0 && y<height){
						buf[x][y] = 255;
					}
				}
			}
		}
	}
	// 結果をコピー
	var idx;
	for(var i=0; i<height; ++i) {
		for(var j=0; j<width; ++j) {
			idx = width*i+j;
			imgData.data[4*idx]=buf[j][i];
			imgData.data[4*idx+1]=buf[j][i];
			imgData.data[4*idx+2]=buf[j][i];
		}
	}
}


