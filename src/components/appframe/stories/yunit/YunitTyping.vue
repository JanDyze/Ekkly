<!-- Three dots while YUNIT works his answer out, as his page shows them. -->
<template>
  <span class="yunit-typing flex gap-1.5 py-2 text-gray-400" aria-hidden="true"><i></i><i></i><i></i></span>
</template>

<style scoped>
.yunit-typing i {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 9999px;
  background: currentColor;
  opacity: 0.35;
  animation: yunit-typing 1.1s ease-in-out infinite;
}

.yunit-typing i:nth-child(2) {
  animation-delay: 0.15s;
}

.yunit-typing i:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes yunit-typing {
  30% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .yunit-typing i {
    animation: none;
  }
}
</style>
