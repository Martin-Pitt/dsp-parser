export class BufferStreamAssets {
	constructor(buf, isBigEndian = true) {
		this.pos = 0;
		this.buf = Buffer.from(buf);
		this.isBigEndian = isBigEndian;
	}
	
	read(length) {
		let part = Buffer.from(this.buf.subarray(this.pos, this.pos + length));
		this.pos += length;
		return part;
	}
	
	readInt8() {
		let val = this.buf.readInt8(this.pos);
		this.pos += 1;
		return val;
	}
	
	readInt16() {
		let val;
		if(this.isBigEndian) val = this.buf.readInt16BE(this.pos);
		else val = this.buf.readInt16LE(this.pos);
		this.pos += 2;
		return val;
	}
	
	readInt32() {
		let val;
		if(this.isBigEndian) val = this.buf.readInt32BE(this.pos);
		else val = this.buf.readInt32LE(this.pos);
		this.pos += 4;
		return val;
	}
	
	readInt64() {
		let val;
		if(this.isBigEndian) val = this.buf.readBigInt64BE(this.pos);
		else val = this.buf.readBigInt64LE(this.pos);
		this.pos += 8;
		return val;
	}
	
	readUInt8() {
		let val = this.buf.readUInt8(this.pos);
		this.pos += 1;
		return val;
	}
	
	readUInt16() {
		let val;
		if(this.isBigEndian) val = this.buf.readUInt16BE(this.pos);
		else val = this.buf.readUInt16LE(this.pos);
		this.pos += 2;
		return val;
	}
	
	readUInt32() {
		let val;
		if(this.isBigEndian) val = this.buf.readUInt32BE(this.pos);
		else val = this.buf.readUInt32LE(this.pos);
		this.pos += 4;
		return val;
	}
	
	readUInt64() {
		let val;
		if(this.isBigEndian) val = this.buf.readBigUInt64BE(this.pos);
		else val = this.buf.readBigUInt64LE(this.pos);
		this.pos += 8;
		return val;
	}
	
	readString() {
		let nextNull = this.buf.indexOf(0, this.pos);
		if(nextNull === -1) return null;
		
		let part = this.buf.subarray(this.pos, nextNull)
		this.pos = nextNull + 1;
		return part;
	}
	
	align() {
		let from = this.pos;
		let to = (this.pos + 3) & -4; // Align to byte packing
		this.pos = to;
		return to-from;
	}
}




export class BufferStreamData {
	pos = 0;
	buf = null;
	isBigEndian = true;
	
	constructor(buf, isBigEndian = true) {
		if(buf) this.buf = Buffer.from(buf);
		this.isBigEndian = isBigEndian;
	}
	
	read(length) {
		let part = Buffer.from(this.buf.subarray(this.pos, this.pos + length));
		this.pos += length;
		return part;
	}
	
	readInt8() {
		let val = this.buf.readInt8(this.pos);
		this.pos += 1;
		return val;
	}
	
	readInt16() {
		let val;
		if(this.isBigEndian) val = this.buf.readInt16BE(this.pos);
		else val = this.buf.readInt16LE(this.pos);
		this.pos += 2;
		return val;
	}
	
	readInt32() {
		let val;
		if(this.isBigEndian) val = this.buf.readInt32BE(this.pos);
		else val = this.buf.readInt32LE(this.pos);
		this.pos += 4;
		return val;
	}
	
	readInt64() {
		let val;
		if(this.isBigEndian) val = this.buf.readBigInt64BE(this.pos);
		else val = this.buf.readBigInt64LE(this.pos);
		this.pos += 8;
		return val;
	}
	
	readUInt8() {
		let val = this.buf.readUInt8(this.pos);
		this.pos += 1;
		return val;
	}
	
	readUInt16() {
		let val;
		if(this.isBigEndian) val = this.buf.readUInt16BE(this.pos);
		else val = this.buf.readUInt16LE(this.pos);
		this.pos += 2;
		return val;
	}
	
	readUInt32() {
		let val;
		if(this.isBigEndian) val = this.buf.readUInt32BE(this.pos);
		else val = this.buf.readUInt32LE(this.pos);
		this.pos += 4;
		return val;
	}
	
	readUInt64() {
		let val;
		if(this.isBigEndian) val = this.buf.readBigUInt64BE(this.pos);
		else val = this.buf.readBigUInt64LE(this.pos);
		this.pos += 8;
		return val;
	}
	
	readFloat() {
		let val;
		if(this.isBigEndian) val = this.buf.readFloatBE(this.pos);
		else val = this.buf.readFloatLE(this.pos);
		this.pos += 4;
		return val;
	}
	
	readDouble() {
		let val;
		if(this.isBigEndian) val = this.buf.readDoubleBE(this.pos);
		else val = this.buf.readDoubleLE(this.pos);
		this.pos += 8;
		return val;
	}
	
	readBool(width = 4) {
		let value;
		switch(width) {
			case 4: value = this.readInt32(); break;
			case 2: value = this.readInt16(); break;
			case 1: value = this.readInt8(); break;
			default: throw new Error('Unspecified width for bool');
		}
		if(value === 0) return false;
		if(value === 1) return true;
		else throw new Error(`Byte (${value}) does not read as bool`);
	}
	
	readString(align = true) {
		let length = this.readInt32();
		if(!length) return Buffer.alloc(0);
		if(length > this.buf.length) throw new Error('String length exceeds buffer length');
		let string = this.read(length);
		if(align) this.align();
		return string;
	}
	
	readArray(callback) {
		let results = [];
		let length = this.readInt32();
		if(length > this.buf.length) throw new Error('Array length exceeds buffer length');
		for(let index = 0; index < length; ++index)
		{
			let result = callback(index, length);
			results.push(result);
		}
		return results;
	}
	
	readByteArray() {
		let length = this.readInt32();
		if(length > this.buf.length) throw new Error('ByteArray length exceeds buffer length');
		return this.read(length);
	}
	
	align() {
		this.pos = (this.pos + 3) & -4;
	}
}

export function isValidProtoSetHeader(stream) {
	// Unity header bits
	// 12-byte PPtr, 1-byte enabled field of true, 3 padding bytes
	// [00 00 00 00 00 00 00 00 00 00 00 00] [01] [00 00 00]
	const ProtoSetHeaderBitsExpected = Buffer.from(new Uint8Array([
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00
	]));
	const ProtoSetHeaderBits = stream.read(16);
	stream.read(12); // Skip another PPtr and more
	return Buffer.compare(
		ProtoSetHeaderBitsExpected,
		ProtoSetHeaderBits,
	) === 0;
}