#include "picsim.h"
#include <stdint.h>
#include <string.h>

extern void dirt_load(_pic *pic);

static _pic processor;
static int registered = 0;
static int loaded = 0;

void osem_initialize(void) {
  if (registered) return;
  memset(&processor, 0, sizeof(processor));
  dirt_load(&processor);
  registered = 1;
}

int osem_supported(const char *name) {
  osem_initialize();
  return getprocbyname(name) != 0;
}

int osem_load(const char *name) {
  osem_initialize();
  if (loaded) {
    pic_end(&processor);
    loaded = 0;
  }

  memset(&processor, 0, sizeof(processor));
  unsigned int id = getprocbyname(name);
  if (id == 0) return -1;

  if (pic_init(&processor, id, "/firmware.hex", 0, 20000000.0f) != 0) {
    pic_end(&processor);
    memset(&processor, 0, sizeof(processor));
    return -2;
  }

  loaded = 1;
  return 0;
}

int osem_step(int count) {
  if (!loaded || count <= 0 || count > 1000000) return -1;
  for (int index = 0; index < count; index++) {
    pic_step(&processor);
    if (processor.error_flags != PE_NOERRO) return -2;
  }
  return 0;
}

int osem_reset(void) {
  if (!loaded) return -1;
  return pic_reset(&processor, 1);
}

uint32_t osem_pc(void) {
  return loaded ? processor.pc : 0;
}

uint32_t osem_w(void) {
  return loaded ? processor.w : 0;
}

uint32_t osem_cycles(void) {
  return loaded ? (uint32_t) processor.cycles : 0;
}

uint32_t osem_ram_size(void) {
  return loaded ? processor.RAMSIZE : 0;
}

uint32_t osem_ram(uint32_t address) {
  return loaded && address < processor.RAMSIZE ? processor.ram[address] : 0;
}

uint32_t osem_pin_count(void) {
  return loaded ? processor.PINCOUNT : 0;
}

uint32_t osem_pin(uint32_t pin) {
  return loaded && pin > 0 && pin <= processor.PINCOUNT
    ? pic_get_pin(&processor, (unsigned char) pin)
    : 0;
}

int osem_set_pin(uint32_t pin, uint32_t value) {
  return loaded && pin > 0 && pin <= processor.PINCOUNT
    ? pic_set_pin(&processor, (unsigned char) pin, (unsigned char) (value ? 1 : 0))
    : -1;
}

void osem_end(void) {
  if (!loaded) return;
  pic_end(&processor);
  memset(&processor, 0, sizeof(processor));
  loaded = 0;
}
