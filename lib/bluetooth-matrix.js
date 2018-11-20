
(function() {
	'use strict';


	const MATRIXES = [

		/* TimeBox */
		{
			'filter':		{ namePrefix: 'TimeBox' },
			'services':		[ 0x180a, '49535343-fe7d-4ae5-8fa9-9fafd205e455' ],
			'properties':	{ width: 11, height: 11 },
			
			'draw':	{
				'service':			'49535343-fe7d-4ae5-8fa9-9fafd205e455',
				'characteristic':	'49535343-1e4d-4bd9-ba61-23c647249616',
				'format':			(r, g, b, position) => Timebox.drawPixel(r, g, b, position)
			},

			'clear': {
				'service':			'49535343-fe7d-4ae5-8fa9-9fafd205e455',
				'characteristic':	'49535343-1e4d-4bd9-ba61-23c647249616',
				'call':				function(characteristic) {
										return new Promise((resolve, reject) => {
											characteristic.writeValue(Timebox.enterDrawingMode()).then(() => {
												window.setTimeout(function() {
													characteristic.writeValue(Timebox.drawPixels(0, 0, 0, [0, 1])).then(() => {
														resolve();
													});
										  		}, 100);
										  	});
										});
									}
			}
		},


		/* Dotti */
		{
			'filter':		{ namePrefix: 'Dotti' },
			'services':		[ 0xfff0 ],
			'properties': 	{ width: 8, height: 8 },
			
			'draw':	{
				'service':			0xfff0,
				'characteristic':	0xfff3,
				'format':			(r, g, b, position) => new Uint8Array([ 0x07, 0x02, position + 1, r, g, b  ])
			},
			
			'clear': {
				'service':			0xfff0,
				'characteristic':	0xfff3,
				'format':			() => new Uint8Array([ 0x06, 0x01, 0x00, 0x00, 0x00  ])
			}
		}
	]


	class BluetoothMatrix {
		constructor() {
			this._EVENTS = {}
			this._SERVER = null;
			this._MATRIX = null;
			this._QUEUE = [];
			this._WORKING = false;
		}
		
		connect() {
            console.log('Requesting Bluetooth Device...');
            
            return new Promise((resolve, reject) => {
            
	            navigator.bluetooth.requestDevice({
		            filters: MATRIXES.map(item => item.filter),
					optionalServices: MATRIXES.map(i => i.services).reduce((a, b) => a.concat(b))
				})
		            .then(device => {
		                console.log('Connecting to GATT Server...');

		                device.addEventListener('gattserverdisconnected', this._disconnect.bind(this));
		                return device.gatt.connect();
		            })
		            .then(server => {
						this._inspect(server)
							.then(matrix => {
								this._SERVER = server;
								this._MATRIX = matrix;
	
								this.clear().then(() => {
									resolve();
								});
							})
							.catch(() => {});
		            })
		            .catch(error => {
		                console.log('Could not connect! ' + error);
						reject();
		            });			
			});
			
		}
		
		draw(color, x, y) {
            return new Promise((resolve, reject) => {
				if (!this._SERVER) return reject();
				this._queue(() => this._draw(color, x, y).then(() => resolve()));
			});
		}

		clear() {
            return new Promise((resolve, reject) => {
				if (!this._SERVER) return reject();
				this._queue(() => this._clear().then(() => resolve()));
			});
		}

		addEventListener(e, f) {
			this._EVENTS[e] = f;
		}

		get connected() {
			return !! this._SERVER;
		}
		
		get width() {
			if (this._MATRIX) return this._MATRIX.properties.width; 
		}
		
		get height() {
			if (this._MATRIX) return this._MATRIX.properties.height; 
		}
		
		_queue(f) {
			var that = this;
			
			function run() {
				if (!that._QUEUE.length) {
					that._WORKING = false; 
					return;
				}
				
				that._WORKING = true;
				(that._QUEUE.shift()()).then(() => run());
			}
			
			that._QUEUE.push(f);
			
			if (!that._WORKING) run();	
		}

		_draw(color, x, y) {
            return new Promise((resolve, reject) => {
			    this._SERVER.getPrimaryService(this._MATRIX.draw.service)
					.then(service => service.getCharacteristic(this._MATRIX.draw.characteristic))
		            .then(characteristic => {
			            var p = 0 + (parseInt(y) * this._MATRIX.properties.width) + parseInt(x);
			            
			            var c = parseInt(color.substring(1), 16);
					    var r = (c >> 16) & 255;
					    var g = (c >> 8) & 255;
					    var b = c & 255;
	
						var buffer = this._MATRIX.draw.format(r, g, b, p);
		                characteristic.writeValue(buffer)
		                	.then(() => { resolve(); });
		            });
			});
		}
		
		_clear() {
            return new Promise((resolve, reject) => {
			    this._SERVER.getPrimaryService(this._MATRIX.clear.service)
					.then(service => service.getCharacteristic(this._MATRIX.clear.characteristic))
					.then(characteristic => {
						if (this._MATRIX.clear.format) {
							characteristic.writeValue(this._MATRIX.clear.format())
								.then(() => { resolve(); })
						}
						
						if (this._MATRIX.clear.call) {
							this._MATRIX.clear.call(characteristic)
								.then(() => { resolve(); })
						}
					});
			});
		}
		
		_disconnect() {
            console.log('Disconnected from GATT Server...');

			this._SERVER = null;
			
			if (this._EVENTS['disconnected']) {
				this._EVENTS['disconnected']();
			}
		}

		_inspect(server) {
			return new Promise((resolve, reject) => {
                console.log('Retrieving Primary Services');

				server.getPrimaryServices()
					.then(services => { 
						let found = services.map(service => this._normalizeGuid(service.uuid));
						
						let result = MATRIXES.some(matrix => {
							if (matrix.services.length == found.length && 
								matrix.services
									.map(item => this._normalizeGuid(item))
									.filter(item => found.includes(item)).length == found.length) 
							{
								resolve(matrix);
								return true;
							}
						});
						
						if (!result) {
							reject();
						}
					})
		            .catch(error => {
		                console.log('Could not retrieve Primary Services! ' + error);
						reject();
		            });			
			});
		}
		
		_normalizeGuid(guid) {
			if (typeof guid == "number") {
				guid = ("0000" + guid.toString(16)).slice(-4);
			}
			
			if (typeof guid == "string") {
				if (guid.length == 4) {
					return "0000" + guid.toLowerCase() + "-0000-1000-8000-00805f9b34fb";
				}
				
				if (guid.length == 36) {
					return guid.toLowerCase();
				}
			}
		}
	}

	window.BluetoothMatrix = new BluetoothMatrix();
})();

