Z80 = {
	//Time clock: Z80 has two types (m and t)
	_clock: {m:0, t:0},

	//Registers
	_r:{
		a:0, b:0, c:0, d:0, e:0, h:0, l:0, f:0, //8-bit
		pc:0, sp:0, 							//16-bit
		m:0, t:0            //clock for last instruction
	},

	ADDr_e: function(){
		Z80._r.a += Z80._r.e; //addition
		Z80._r.f = 0; //Clear flags
		if(!(Z80._r.a & 255)) Z80._r.f |= 0x80; //Zero?
		if(Z80._r.a > 255) Z80._r.f |= 0x10; //Carry?
		Z80._r.a &= 255; //Mask to 8-bits
		Z80._r.m = 1; Z80._r.t = 4;
	},

	//Compare B to A, setting flags (CP A, B)
	CPr_b: function(){
		var i = Z80._r.a; //temp copy reg a
		i -= Z80._r.b; //subtract b
		Z80._r.f |= 0x40; //subtraction flag
		if(!(i & 255)) Z80._r.f |= 0x80; //Zero?
		if (i < 0) Z80._r.f |= 0x10; //Underflow?
		Z80._r.m = 1; Z80._r.t = 4;
	},

	//No-Operation (NOP)
	NOP: function(){
		Z80._r.m = 1; Z80._r.t = 4;
	},

	//MEMORY HANDLING

	//Push registers B and C to stack (PUSH BC)
	PUSHBC: function(){
		Z80._r.sp--; //Drop through stack
		MMU.wb(Z80._r.sp, Z80._r.b); //Write B on stack
		Z80._r.sp--; //Drop again
		MMU.wb(Z80._r.sp, Z80._r.c); //Write C on stack
		Z80._r.m = 3; Z80._r.t = 12; //3-M times taken
	},

	//Pop registers H and L off the stack (POP HL)
	POPHL: function(){
		Z80._r.l = MMU.rb(Z80._r.sp); //Read L
		Z80._r.sp++; //Move back up the stack
		Z80._r.h = MMU.rb(Z80._r.sp); //Read Half
		Z80._r.sp++; //Up the stack
		Z80._r.m = 3; Z80._r.t = 12; //3-M times
	},

	//Read a byte from absolute location int A (LD A, addr)

	LDAmm: function(){
		var addr = MMU.rw(Z80._r.pc); //Get addr from instr
		Z80._r.pc += 2; //Advance PC
		Z80._r.a = MMU.rb(addr);
		Z80._r.m = 4; Z80._r.t = 16;
	},

	//Reset

	reset: function(){
		Z80._r.a = 0; Z80._r.b = 0; Z80._r.c = 0; 
		Z80._r.d = 0; Z80._r.e = 0; Z80._r.h = 0;
		Z80._r.l = 0; Z80._r.f = 0; Z80._r.pc = 0;
		Z80._r.sp = 0;

		Z80._r.m = 0; Z80._r.t = 0;
	}
};

//Dispatcher (Fetch-Decode-Execute)

while(true)
{
	var op = MMU.rb(Z80._r.pc++); //Fetch instruction addr
	Z80._map[op](); //Dispatcher
	Z80._r.pc &= 65535; //mask PC to 16 bits
	Z80._clock.m += Z80._r.m; //Add time to CPU clock
	Z80._clock.t += Z80._r.t;
}

Z80._map = [
  // 00
  Z80._ops.NOP,		Z80._ops.LDBCnn,	Z80._ops.LDBCmA,	Z80._ops.INCBC,
  Z80._ops.INCr_b,	Z80._ops.DECr_b,	Z80._ops.LDrn_b,	Z80._ops.RLCA,
  Z80._ops.LDmmSP,	Z80._ops.ADDHLBC,	Z80._ops.LDABCm,	Z80._ops.DECBC,
  Z80._ops.INCr_c,	Z80._ops.DECr_c,	Z80._ops.LDrn_c,	Z80._ops.RRCA,
  // 10
  Z80._ops.DJNZn,	Z80._ops.LDDEnn,	Z80._ops.LDDEmA,	Z80._ops.INCDE,
  Z80._ops.INCr_d,	Z80._ops.DECr_d,	Z80._ops.LDrn_d,	Z80._ops.RLA,
  Z80._ops.JRn,		Z80._ops.ADDHLDE,	Z80._ops.LDADEm,	Z80._ops.DECDE,
  Z80._ops.INCr_e,	Z80._ops.DECr_e,	Z80._ops.LDrn_e,	Z80._ops.RRA,
  // 20
  Z80._ops.JRNZn,	Z80._ops.LDHLnn,	Z80._ops.LDHLIA,	Z80._ops.INCHL,
  Z80._ops.INCr_h,	Z80._ops.DECr_h,	Z80._ops.LDrn_h,	Z80._ops.DAA,
  Z80._ops.JRZn,	Z80._ops.ADDHLHL,	Z80._ops.LDAHLI,	Z80._ops.DECHL,
  Z80._ops.INCr_l,	Z80._ops.DECr_l,	Z80._ops.LDrn_l,	Z80._ops.CPL,
  // 30
  Z80._ops.JRNCn,	Z80._ops.LDSPnn,	Z80._ops.LDHLDA,	Z80._ops.INCSP,
  Z80._ops.INCHLm,	Z80._ops.DECHLm,	Z80._ops.LDHLmn,	Z80._ops.SCF,
  Z80._ops.JRCn,	Z80._ops.ADDHLSP,	Z80._ops.LDAHLD,	Z80._ops.DECSP,
  Z80._ops.INCr_a,	Z80._ops.DECr_a,	Z80._ops.LDrn_a,	Z80._ops.CCF,
  // 40
  Z80._ops.LDrr_bb,	Z80._ops.LDrr_bc,	Z80._ops.LDrr_bd,	Z80._ops.LDrr_be,
  Z80._ops.LDrr_bh,	Z80._ops.LDrr_bl,	Z80._ops.LDrHLm_b,	Z80._ops.LDrr_ba,
  Z80._ops.LDrr_cb,	Z80._ops.LDrr_cc,	Z80._ops.LDrr_cd,	Z80._ops.LDrr_ce,
  Z80._ops.LDrr_ch,	Z80._ops.LDrr_cl,	Z80._ops.LDrHLm_c,	Z80._ops.LDrr_ca,
  // 50
  Z80._ops.LDrr_db,	Z80._ops.LDrr_dc,	Z80._ops.LDrr_dd,	Z80._ops.LDrr_de,
  Z80._ops.LDrr_dh,	Z80._ops.LDrr_dl,	Z80._ops.LDrHLm_d,	Z80._ops.LDrr_da,
  Z80._ops.LDrr_eb,	Z80._ops.LDrr_ec,	Z80._ops.LDrr_ed,	Z80._ops.LDrr_ee,
  Z80._ops.LDrr_eh,	Z80._ops.LDrr_el,	Z80._ops.LDrHLm_e,	Z80._ops.LDrr_ea,
  // 60
  Z80._ops.LDrr_hb,	Z80._ops.LDrr_hc,	Z80._ops.LDrr_hd,	Z80._ops.LDrr_he,
  Z80._ops.LDrr_hh,	Z80._ops.LDrr_hl,	Z80._ops.LDrHLm_h,	Z80._ops.LDrr_ha,
  Z80._ops.LDrr_lb,	Z80._ops.LDrr_lc,	Z80._ops.LDrr_ld,	Z80._ops.LDrr_le,
  Z80._ops.LDrr_lh,	Z80._ops.LDrr_ll,	Z80._ops.LDrHLm_l,	Z80._ops.LDrr_la,
  // 70
  Z80._ops.LDHLmr_b,	Z80._ops.LDHLmr_c,	Z80._ops.LDHLmr_d,	Z80._ops.LDHLmr_e,
  Z80._ops.LDHLmr_h,	Z80._ops.LDHLmr_l,	Z80._ops.HALT,		Z80._ops.LDHLmr_a,
  Z80._ops.LDrr_ab,	Z80._ops.LDrr_ac,	Z80._ops.LDrr_ad,	Z80._ops.LDrr_ae,
  Z80._ops.LDrr_ah,	Z80._ops.LDrr_al,	Z80._ops.LDrHLm_a,	Z80._ops.LDrr_aa,
  // 80
  Z80._ops.ADDr_b,	Z80._ops.ADDr_c,	Z80._ops.ADDr_d,	Z80._ops.ADDr_e,
  Z80._ops.ADDr_h,	Z80._ops.ADDr_l,	Z80._ops.ADDHL,		Z80._ops.ADDr_a,
  Z80._ops.ADCr_b,	Z80._ops.ADCr_c,	Z80._ops.ADCr_d,	Z80._ops.ADCr_e,
  Z80._ops.ADCr_h,	Z80._ops.ADCr_l,	Z80._ops.ADCHL,		Z80._ops.ADCr_a,
  // 90
  Z80._ops.SUBr_b,	Z80._ops.SUBr_c,	Z80._ops.SUBr_d,	Z80._ops.SUBr_e,
  Z80._ops.SUBr_h,	Z80._ops.SUBr_l,	Z80._ops.SUBHL,		Z80._ops.SUBr_a,
  Z80._ops.SBCr_b,	Z80._ops.SBCr_c,	Z80._ops.SBCr_d,	Z80._ops.SBCr_e,
  Z80._ops.SBCr_h,	Z80._ops.SBCr_l,	Z80._ops.SBCHL,		Z80._ops.SBCr_a,
  // A0
  Z80._ops.ANDr_b,	Z80._ops.ANDr_c,	Z80._ops.ANDr_d,	Z80._ops.ANDr_e,
  Z80._ops.ANDr_h,	Z80._ops.ANDr_l,	Z80._ops.ANDHL,		Z80._ops.ANDr_a,
  Z80._ops.XORr_b,	Z80._ops.XORr_c,	Z80._ops.XORr_d,	Z80._ops.XORr_e,
  Z80._ops.XORr_h,	Z80._ops.XORr_l,	Z80._ops.XORHL,		Z80._ops.XORr_a,
  // B0
  Z80._ops.ORr_b,	Z80._ops.ORr_c,		Z80._ops.ORr_d,		Z80._ops.ORr_e,
  Z80._ops.ORr_h,	Z80._ops.ORr_l,		Z80._ops.ORHL,		Z80._ops.ORr_a,
  Z80._ops.CPr_b,	Z80._ops.CPr_c,		Z80._ops.CPr_d,		Z80._ops.CPr_e,
  Z80._ops.CPr_h,	Z80._ops.CPr_l,		Z80._ops.CPHL,		Z80._ops.CPr_a,
  // C0
  Z80._ops.RETNZ,	Z80._ops.POPBC,		Z80._ops.JPNZnn,	Z80._ops.JPnn,
  Z80._ops.CALLNZnn,	Z80._ops.PUSHBC,	Z80._ops.ADDn,		Z80._ops.RST00,
  Z80._ops.RETZ,	Z80._ops.RET,		Z80._ops.JPZnn,		Z80._ops.MAPcb,
  Z80._ops.CALLZnn,	Z80._ops.CALLnn,	Z80._ops.ADCn,		Z80._ops.RST08,
  // D0
  Z80._ops.RETNC,	Z80._ops.POPDE,		Z80._ops.JPNCnn,	Z80._ops.XX,
  Z80._ops.CALLNCnn,	Z80._ops.PUSHDE,	Z80._ops.SUBn,		Z80._ops.RST10,
  Z80._ops.RETC,	Z80._ops.RETI,		Z80._ops.JPCnn,		Z80._ops.XX,
  Z80._ops.CALLCnn,	Z80._ops.XX,		Z80._ops.SBCn,		Z80._ops.RST18,
  // E0
  Z80._ops.LDIOnA,	Z80._ops.POPHL,		Z80._ops.LDIOCA,	Z80._ops.XX,
  Z80._ops.XX,		Z80._ops.PUSHHL,	Z80._ops.ANDn,		Z80._ops.RST20,
  Z80._ops.ADDSPn,	Z80._ops.JPHL,		Z80._ops.LDmmA,		Z80._ops.XX,
  Z80._ops.XX,		Z80._ops.XX,		Z80._ops.XORn,		Z80._ops.RST28,
  // F0
  Z80._ops.LDAIOn,	Z80._ops.POPAF,		Z80._ops.LDAIOC,	Z80._ops.DI,
  Z80._ops.XX,		Z80._ops.PUSHAF,	Z80._ops.ORn,		Z80._ops.RST30,
  Z80._ops.LDHLSPn,	Z80._ops.XX,		Z80._ops.LDAmm,		Z80._ops.EI,
  Z80._ops.XX,		Z80._ops.XX,		Z80._ops.CPn,		Z80._ops.RST38
];

/*
 * There are four flags:
 * Zero: 0x80 - 1000 0000
 * Operation: - 0100 0000
 * Half-Carry: 0x20 - 0010 0000
 * Carry: 0x10 - 0001 0000
*/


