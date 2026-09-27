# tsunde - RP2040 (Pico) split, 21 direct-pin keys per half, UART link on GP0/GP1.
#
# Build:
#   qmk compile -kb tsunde -km default -j4
# Flash the SAME .hex to both halves; whichever you plug into USB is the master.
MCU = RP2040
