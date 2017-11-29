Timebox = {

    encodeCommand: function(command) {
        let payload = new Uint8Array(command.length + 4);

        /* 
            Message payload starts with two bytes for the length of the payload, 
            excluding 2 bytes which are used for storing the checksum.
        */

        payload[0] = payload.length - 2;
        payload[1] = payload.length - 2 >>> 8;

        /*
            Copy the command into the payload
        */

        payload.set(command, 2);

        /* 
            Calculate the checksum based by adding up all the bytes of the payload
        */ 

        let checksum = payload.reduce((a, b) => a + b, 0);
        payload[payload.length - 2] = checksum;
        payload[payload.length - 1] = checksum >>> 8;

        /*
            The final message we are going to write starts with 0x01 and ends with 0x02,
            which means that the message can't actually contain the bytes with these values,
            because otherwise the Timebox might think the message is terminated in the
            middle of the payload. So we need to escape those bytes. WTF!? 
        */

        let extra = payload.filter(value => value === 0x01 || value === 0x02 || value == 0x03).length;
        let message = new Uint8Array(payload.length + extra + 2);

        let m = 1;

        for (let i = 0; i < payload.length; i++) {
            if (payload[i] === 0x01) {
                message[m] = 0x03;
                message[m + 1] = 0x04;
                m += 2;
            }
            else if (payload[i] === 0x02) {
                message[m] = 0x03;
                message[m + 1] = 0x05;
                m += 2;
            }
            else if (payload[i] === 0x03) {
                message[m] = 0x03;
                message[m + 1] = 0x06;
                m += 2;
            }
            else {
                message[m] = payload[i];
                m++;
            }
        }

        /*
            Add the markers for the beginning and the end of the message 
        */

        message[0] = 0x01;
        message[message.length - 1] = 0x02;

        return message;
    },

    drawPixel: function(r, g, b, position) {
        return Timebox.encodeCommand(
            new Uint8Array([ 
                0x58,                   // Drawing pad control
                r, g, b,                // color
                0x01,                   // number of positions = 1
                position                // single position: 0 to (11 x 11) - 1
            ])
        )
    },

    drawPixels: function(r, g, b, positions) {
	    var buffer = new Uint8Array(5 + positions.length);
	    
	    buffer[0] = 0x58;				// Drawing pad control
	    buffer[1] = r;					// color
	    buffer[2] = g;
	    buffer[3] = b;
	    buffer[4] = positions.length;	// number of positions
	    buffer.set(positions, 5);		// array of positions: 0 to (11 x 11) - 1
	    
        return Timebox.encodeCommand(buffer);
    },

    enterDrawingMode: function() {
        return Timebox.encodeCommand(
            new Uint8Array([ 
                0x44,                   // Enter drawing mode
                0x00,
                0x0a,
                0x0a,
                0x04
            ])
        )
    },

    leaveDrawingMode: function() {
        return Timebox.encodeCommand(
            new Uint8Array([ 
                0x5a                    // Leave drawing mode
            ])
        )
    },

    setModeClock: function() {
        return Timebox.encodeCommand(
            new Uint8Array([ 
                0x45,                   // Change box mode
                0x00,                   // to clock
                0x00,                   // type: 0 = 12, 1 = 24
                0xff, 0xff, 0xff        // color
            ])
        )
    },

    setModeTemp: function() {
        return Timebox.encodeCommand(
            new Uint8Array([ 
                0x45,                   // Change box mode
                0x01,                   // to temperature
                0x00,                   // type: 0 = C, 1 = F
                0xff, 0xff, 0xff        // color
            ])
        )
    },

    setModeLight: function(r, g, b) {
        return Timebox.encodeCommand(
            new Uint8Array([ 
                0x45,                   // Change box mode
                0x02,                   // to light
                r, g, b,       			// color
                0x64,                   // intensity: 0x00 - 0x64
                0x00                    // mode: 0x00 - 0x01            ?
            ])
        )
    },

    setModeAnimation: function(preset) {
        return Timebox.encodeCommand(
            new Uint8Array([ 
                0x45,                   // Change box mode
                0x03,                   // to animation
                preset
            ])
        )
    },

    setModeSound: function(preset) {
        return Timebox.encodeCommand(
            new Uint8Array([ 
                0x45,                   // Change box mode
                0x04,                   // to sound based animation
                preset,
                0xff, 0x00, 0x00,       // top color
                0xff, 0xff, 0xff        // active color
            ])
        )
    },

    setModeImage: function() {
        return Timebox.encodeCommand(
            new Uint8Array([ 
                0x45,                   // Change box mode
                0x05                    // to user image
            ])
        )
    },
    
    sendImage: function(image) {
	  	var encodedImage = Timebox.encodeImage(image);
	  	
	  	var buffer = new Uint8Array(encodedImage.length + 5);
	  	
	  	buffer[0] = 0x44;
	  	buffer.set(encodedImage, 1);
	  	
	  	return Timebox.encodeCommand(buffer);
    },

	createBlackImage: function() {
		return new Uint8Array(11 * 11 * 3);
	},
	
	encodeImage: function(image) {
		let buffer = new Uint8Array(Math.ceil(image.length / 2) + 4);
		
		buffer[0] = 0x00;
		buffer[1] = 0x0a;
		buffer[2] = 0x0a;
		buffer[3] = 0x04;
		
		let b = 4;
		
		for (let i = 0; i < image.length; i += 2) {
			if (i == image.length - 1) {
				buffer[b] = (image[i] >> 4);
			} else {
				buffer[b] = (image[i] >> 4) | ((image[i + 1] >> 4) << 4);
			}

			b++;
		}
		
		return buffer;
	}
}
