MMU = {
	rb: function(addr) { /* read byte from addr */},
	rw: function(addr) {/* read 16-bit word from addr */},

	wb: function(addr, val) { /* write 8-bit to addr*/},
	ww: function(addr, val) {/* write 16-bit word to addr*/}
};