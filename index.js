
var currentColor = 'ffffff';



/* Initialize */

if (!navigator.bluetooth) {
	document.body.classList.add('unsupported');
}



$("#pencil").on("touchstart click", function(e) {
    e.preventDefault();
    document.body.classList.add('pencil');
    document.body.classList.remove('pipet');
});

$("#pipet").on("touchstart click", function(e) {
    e.preventDefault();
    document.body.classList.add('pipet');
    document.body.classList.remove('pencil');
});

$("#clear").on("touchstart click", function(e) {
    e.preventDefault();

    [...document.querySelectorAll("#editor td")].forEach(cell => { 
        cell.dataset.color = "000000"; 
        cell.style.backgroundColor = "#000000"; 
    })
    
    BluetoothMatrix.clear();
});






/* Connect to device */

document.getElementById('connect')
	.addEventListener('click', () => {
		if (!navigator.bluetooth) return;
		
		BluetoothMatrix.connect()
			.then(() => {
				connect();
				
				BluetoothMatrix.addEventListener('disconnected', () => {
					disconnect();
				});
			});
	});

function connect() {
	document.body.classList.add('connected');

	buildTable (BluetoothMatrix.width, BluetoothMatrix.height);
	buildPicker();
}

function disconnect() {
	document.body.classList.remove('connected');
}



buildTable (8, 8);
buildPicker();





/* Build the matrix based on the provided width and height */

function buildTable(width, height) {
    const editor = document.getElementById('editor');
    
    let content = '';
    for (let y = 0; y < height; y++) {
        content += "<tr>";
        for (let x = 0; x < width; x++) {
            content += "<td data-x='" + x + "' data-y='" + y + "' data-color='000000'></td>";
        }
        content += "</tr>";
    }

    editor.innerHTML = content;

    function mouseHandler(e) {
        if (e.which) {
            drawPixel(e.target);
        }

        e.preventDefault();
    }

    editor.addEventListener('mousedown', mouseHandler);
    editor.addEventListener('mouseover', mouseHandler);
    
    function touchHandler(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          let pageX = e.changedTouches[i].pageX;
          let pageY = e.changedTouches[i].pageY;
          
          let el = document.elementFromPoint(pageX, pageY);
          if (el.tagName && el.tagName == 'TD' && editor.contains(el)) {
              drawPixel(el);
          }
        }
        e.preventDefault();
    }

    editor.addEventListener('touchstart', touchHandler);
    editor.addEventListener('touchmove', touchHandler);

    [...editor.querySelectorAll("td")].forEach(cell => { 
        cell.style.backgroundColor = '#' + cell.dataset.color;
    })
}



/* Build the color picker */

function buildPicker() {
	$('#picker').iris({
	    width: 400,
	    hide: false,
	    border: false,
	    width: $('#picker').width(),
	    palettes: ['#000', '#f00', '#ff0', '#0f0', '#00f', '#fff'],
	    change: function(event, ui) {
	        var color = ui.color.toString().substring(1);
	        if (color != currentColor) {
	            currentColor = color;
	        }
	    }
	});
	
	$("#picker").on({
	    touchstart: touchHandler,
	    touchmove: touchHandler,
	    touchend: touchHandler,
	    touchcancel: touchHandler
	});
	
	function touchHandler(event) {
	    if ( !$(event.target).hasClass('ui-draggable') &&
	         !$(event.target).hasClass('ui-slider') &&
	         !$(event.target).hasClass('ui-slider-handle') &&
	         !$(event.target).hasClass('iris-square-inner') &&
	         !$(event.target).hasClass('iris-palette') ) {
	        return;
	    }
	    
	    var touches = event.originalEvent.changedTouches,
	        first = touches[0],
	        type = "";
	    
	    switch(event.type) {
	        case "touchstart": type = "mousedown"; break;
	        case "touchmove":  type="mousemove"; break;
	        case "touchend":   type="mouseup"; break;
	        default: return;
	    }
	    
	    var simulatedEvent = document.createEvent("MouseEvent");
	    simulatedEvent.initMouseEvent(type, true, true, window, 1,
	                            first.screenX, first.screenY,
	                            first.clientX, first.clientY, false,
	                            false, false, false, 0/*left*/, null);
	    first.target.dispatchEvent(simulatedEvent);
	    
	    if (type == "mouseup") {
	        var simulatedEvent = document.createEvent("MouseEvent");
	        simulatedEvent.initMouseEvent("click", true, true, window, 1,
	                                first.screenX, first.screenY,
	                                first.clientX, first.clientY, false,
	                                false, false, false, 0/*left*/, null);
	        first.target.dispatchEvent(simulatedEvent);
	    }
	    event.preventDefault();
	}	
}



/* Handle picking colors using the pipet and drawing colors using the pencil */

function drawPixel(el) {
    if (document.body.classList.contains('pipet')) {
        currentColor = el.dataset.color;

        $('#picker').iris('color', "#" + currentColor);

        document.body.classList.add('pencil');
        document.body.classList.remove('pipet');
        return
    }
    
    if (el.dataset.color != currentColor) {
        el.dataset.color = currentColor;
        el.style.backgroundColor = '#' + currentColor;

        BluetoothMatrix.draw('#' + currentColor, $(el).attr('data-x'), $(el).attr('data-y'));
    }
}








function dropHandler(e) {
    e.preventDefault();

    let dt = e.dataTransfer;
    
    if (dt.items) {
        for (let i = 0; i < dt.items.length; i++) {
            if (dt.items[i].kind == "file") {
                handleFile(dt.items[i].getAsFile());
            }
        }
    } else {
        for (let i = 0; i < dt.files.length; i++) {
            handleFile(dt.files[i]);
        }
    }
}

function dragOverHandler(e) {
    e.preventDefault();
}

function handleFile(f) {
    if (f.type == 'image/png' || f.type == 'image/jpg' || f.type == 'image/gif') {
        let c = document.createElement('canvas');
        c.height = BluetoothMatrix.height;
        c.width = BluetoothMatrix.width;
        let ctx = c.getContext('2d');
        
        let img = new Image;
        img.onload = function() {
            ctx.drawImage(img, 0, 0, BluetoothMatrix.width, BluetoothMatrix.height);
            
            for (let x = 0; x < BluetoothMatrix.width; x++) {
                for (let y = 0; y < BluetoothMatrix.height; y++) {
                    let p = ctx.getImageData(x, y, 1, 1).data;
                    let c = ("000000" + rgbToHex(p[0], p[1], p[2])).slice(-6)

                    let td = document.querySelector('td[data-x="' + x + '"][data-y="' + y + '"]');

                    if (td.dataset.color != c) {
                        td.dataset.color = c;
                        td.style.backgroundColor = '#' + c;
                        
                        BluetoothMatrix.draw('#' + c, x, y);
                    }
                }
            }
        }

        img.src = URL.createObjectURL(f);
    }
}

function rgbToHex(r, g, b) {
    if (r > 255 || g > 255 || b > 255)
        throw "Invalid color component";
    return ((r << 16) | (g << 8) | b).toString(16);
}