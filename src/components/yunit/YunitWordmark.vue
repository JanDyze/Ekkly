<!-- YUNIT's wordmark: a dotless i with his own blue dot over it, as in the
     logo. The blue is his, never the church's accent (BRAND.md), which is why
     it is a fixed colour here and not a token. Set on his page, on the home,
     and in his story. -->
<template>
  <span aria-label="YUNIT">YUN<span class="yunit-i" aria-hidden="true">ı</span>T</span>
</template>

<style scoped>
.yunit-i {
  position: relative;
  display: inline-block;
}

.yunit-i::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 0.02em;
  width: 0.26em;
  height: 0.26em;
  border-radius: 9999px;
  background: #1a85ff;
  translate: -50% 0;
}
</style>
