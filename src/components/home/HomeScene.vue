<script setup>
// The home's picture: a church on its hill under a morning sky, traced by
// hand from a painting so that every colour in it is a setting rather than a
// pixel. Change the --scene-* values below (or override them on a wrapper) to
// recolour it; change a path to redesign a piece of it.
//
// It comes in two parts, because the home is full of cards and the church
// must never stand behind them:
//
//   sky  — the sky, the panes of light in its corner (Ekkly's window, its
//          panes and the cross between them) and the clouds. It fills the
//          whole page behind everything, from the top.
//   land — the hills, the bushes and the church. It stands in the room left
//          under the apps, sized to that room's height, so the church is
//          always whole, cross and all. The hills run on far to the left (to
//          -4000), so the drawing is always wider than the room in proportion:
//          a drawing narrower than its room would be scaled to the width
//          instead, and lose the top of the cross off the top of the room.
//
// Both draw in the painting's own coordinates (887 × 1774), so the two halves
// line up as one picture however they are placed.

defineProps({
  part: { type: String, default: 'sky' },
})
</script>

<template>
  <svg
    v-if="part === 'sky'"
    class="home-scene-sky"
    viewBox="0 0 887 1774"
    preserveAspectRatio="xMidYMin slice"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="scene-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style="stop-color: var(--scene-sky-1)" />
        <stop offset="0.28" style="stop-color: var(--scene-sky-2)" />
        <stop offset="0.51" style="stop-color: var(--scene-sky-3)" />
        <stop offset="0.73" style="stop-color: var(--scene-sky-4)" />
        <stop offset="0.84" style="stop-color: var(--scene-horizon)" />
        <stop offset="1" style="stop-color: var(--scene-horizon)" />
      </linearGradient>
      <radialGradient id="scene-glow" cx="820" cy="1420" r="420" gradientUnits="userSpaceOnUse">
        <stop offset="0" style="stop-color: var(--scene-glow); stop-opacity: 0.9" />
        <stop offset="1" style="stop-color: var(--scene-glow); stop-opacity: 0" />
      </radialGradient>
    </defs>

    <rect width="887" height="1774" fill="url(#scene-sky)" />
    <rect width="887" height="1774" fill="url(#scene-glow)" />

    <!-- Panes of light in the corner, like Ekkly's window seen up close. -->
    <path d="M0 0H338V285C338 345 300 385 240 415L0 522Z" style="fill: var(--scene-pane-dim); opacity: 0.5" />
    <path d="M123 163L297 0H338V285C338 345 300 385 240 415L123 468Z" style="fill: var(--scene-pane); opacity: 0.7" />
    <path d="M0 0H113V165L0 232Z" style="fill: var(--scene-pane); opacity: 0.35" />

    <!-- Clouds drifting higher up, so some of the sky shows between the
         cards above as well as at the foot. -->
    <g style="fill: var(--scene-cloud); opacity: 0.85">
      <path d="M420 520C430 500 460 494 480 504C496 478 540 474 560 498C584 494 604 506 608 520Z" />
      <path d="M-20 722C0 690 40 680 70 692C90 650 150 640 180 672C212 664 250 682 262 722Z" />
      <path d="M600 902C612 872 650 862 676 874C700 836 760 830 790 862C830 850 880 870 900 902Z" />
    </g>

    <!-- Clouds: one each side, and a low bank along the horizon. -->
    <path
      d="M0 1100C45 1100 72 1150 70 1195C98 1182 152 1195 160 1252C200 1255 236 1286 240 1312H0Z"
      style="fill: var(--scene-cloud)"
    />
    <path d="M0 1262C60 1256 110 1268 140 1290C180 1292 220 1300 240 1312H0Z" style="fill: var(--scene-cloud-shade)" />
    <path
      d="M887 1150C860 1160 845 1190 848 1225C815 1225 790 1242 785 1276C750 1282 725 1310 718 1346H887Z"
      style="fill: var(--scene-cloud-warm)"
    />
    <path
      d="M80 1502C110 1480 150 1478 175 1495C200 1470 262 1470 282 1500C330 1490 382 1502 402 1532H80Z"
      style="fill: var(--scene-cloud-warm)"
    />
  </svg>

  <svg
    v-else
    class="home-scene-land"
    viewBox="-4000 1240 4887 534"
    preserveAspectRatio="xMaxYMax slice"
    aria-hidden="true"
  >
    <defs>
      <!-- Ekkly's mark (public/ekkly-mark.svg), its four panes, for the
           church's window. The cross between them is the wall showing
           through, as in the mark itself. -->
      <clipPath id="scene-mark-tl"><path d="M18.6 53Q18 52.6 18 51V46A34 34 0 0 1 48.5 12.2Q52 12 52 15.5V41C52 46.5 41 49.5 20 52.8Z" /></clipPath>
      <clipPath id="scene-mark-tr"><path d="M92.4 53Q93 52.6 93 51V46A34 34 0 0 0 62.5 12.2Q59 12 59 15.5V41C59 46.5 70 49.5 91 52.8Z" /></clipPath>
      <clipPath id="scene-mark-bl"><path d="M18 62Q18 57.5 22 56.3C30 53.5 40 53 45 54.5Q51 56 51 61V93Q51 96 48 96H24Q18 96 18 90Z" /></clipPath>
      <clipPath id="scene-mark-br"><path d="M59.5 61Q59.5 56 65 54.8C70 53.5 80 53.8 88 56Q92.5 57.5 92.5 62V89Q92.5 96 86 96H63Q59.5 96 59.5 92.5Z" /></clipPath>
      <!-- The light a lit window gives at night: a halo round it, and what
           falls from it down the front and onto the hill. Off by day. -->
      <radialGradient id="scene-window-halo" cx="648" cy="1525" r="170" gradientUnits="userSpaceOnUse">
        <stop offset="0" style="stop-color: var(--scene-window-light); stop-opacity: var(--scene-window-glow)" />
        <stop offset="1" style="stop-color: var(--scene-window-light); stop-opacity: 0" />
      </radialGradient>
      <linearGradient id="scene-window-fall" x1="0" y1="1583" x2="0" y2="1774" gradientUnits="userSpaceOnUse">
        <stop offset="0" style="stop-color: var(--scene-window-light); stop-opacity: var(--scene-window-glow)" />
        <stop offset="1" style="stop-color: var(--scene-window-light); stop-opacity: 0" />
      </linearGradient>
    </defs>

    <!-- Hills behind the church, far to near. -->
    <path d="M690 1505C760 1470 820 1452 887 1448V1774H690Z" style="fill: var(--scene-hill-far)" />
    <path
      d="M-4000 1600C-1100 1540 -800 1560 -560 1530C-330 1500 -120 1520 0 1478C40 1462 80 1478 112 1502C160 1488 250 1488 300 1510C360 1535 420 1562 482 1574V1774H-4000Z"
      style="fill: var(--scene-hill-back)"
    />
    <path
      d="M-4000 1590C-1150 1530 -900 1520 -680 1500C-460 1480 -260 1520 -120 1494C-60 1482 -20 1470 0 1470C50 1468 96 1502 120 1562V1774H-4000Z"
      style="fill: var(--scene-hill-left)"
    />
    <path
      d="M-4000 1668C-1100 1626 -820 1640 -560 1618C-320 1598 -140 1622 0 1600C80 1584 160 1562 240 1562C320 1566 400 1598 470 1614V1774H-4000Z"
      style="fill: var(--scene-hill-mid)"
    />

    <!-- The church. The nave's side and its roof first, then the front. -->
    <rect x="742" y="1470" width="124" height="230" style="fill: var(--scene-church-side)" />
    <path d="M770 1625V1572Q770 1560 780 1556Q790 1560 790 1572V1625Z" style="fill: var(--scene-glass)" />
    <path d="M742 1458L866 1512V1534L742 1484Z" style="fill: var(--scene-roof-under)" />
    <path d="M672 1370L790 1445L866 1505V1514L742 1460L672 1404Z" style="fill: var(--scene-roof)" />
    <path d="M672 1370L790 1445L780 1452L672 1384Z" style="fill: var(--scene-roof-light)" />

    <!-- The cross, its upright standing on the gable. -->
    <rect x="664" y="1258" width="11" height="118" rx="1.5" style="fill: var(--scene-cross)" />
    <path d="M638 1293L700 1297V1309L638 1305Z" style="fill: var(--scene-cross)" />

    <!-- The front, its gable trimmed in light along the left. -->
    <path d="M553 1478L668 1372L742 1440V1700H553Z" style="fill: var(--scene-church)" />
    <path d="M557 1470L650 1385V1400L566 1481Z" style="fill: var(--scene-trim)" />


    <!-- The great window is Ekkly's mark, in its own colours, which never
         change (BRAND.md): blue, teal, yellow and orange panes round a cross
         of wall. Its light at night is in the halo behind and over it. -->
    <circle cx="648" cy="1525" r="170" fill="url(#scene-window-halo)" />
    <g transform="translate(579.9 1465.3) scale(1.2267)">
      <g clip-path="url(#scene-mark-tl)">
        <rect x="10" y="8" width="45" height="50" fill="#fdc24b" />
        <path d="M10 31H36L35 46L31 56H10Z" fill="#fdcf5c" />
        <path d="M50 10H56V48L33 54L35 46L36 31Z" fill="#f7b63b" />
      </g>
      <g clip-path="url(#scene-mark-tr)">
        <rect x="56" y="8" width="45" height="50" fill="#f19140" />
        <path d="M82 17L96 34.5H73Z" fill="#dc5a31" />
        <path d="M72 34.5H96V58L57 48Z" fill="#cc6d3d" />
      </g>
      <g clip-path="url(#scene-mark-bl)">
        <rect x="10" y="50" width="45" height="50" fill="#0270dc" />
        <path d="M35 50H56V100H46L35 75Z" fill="#0b6fe3" />
        <path d="M10 50H35V75L10 76Z" fill="#48bcf0" />
      </g>
      <g clip-path="url(#scene-mark-br)">
        <rect x="56" y="50" width="45" height="50" fill="#09a4c6" />
        <path d="M73 50H101V71L84 73L77 74L73 62Z" fill="#027595" />
        <path d="M101 69L86 73L60 99H101Z" fill="#14aaae" />
      </g>
    </g>
    <!-- The front door, under the window, and the light spilling from it all
         down the front and onto the hill at night. -->
    <path d="M630 1700V1636Q630 1614 648 1610Q666 1614 666 1636V1700Z" style="fill: var(--scene-door)" />
    <path d="M598 1583H698L760 1774H536Z" fill="url(#scene-window-fall)" />

    <!-- The side wing, its lean-to roof and arched door. -->
    <path d="M466 1584H553V1700H466Z" style="fill: var(--scene-wing)" />
    <path d="M458 1578L553 1490V1548L470 1588Z" style="fill: var(--scene-roof-wing)" />
    <path d="M505 1700V1652Q505 1628 529 1624Q553 1628 553 1652V1700Z" style="fill: var(--scene-door)" />

    <!-- The mound the church stands on, and the bushes around it. -->
    <path d="M380 1662C460 1652 530 1660 566 1672C624 1612 724 1600 806 1632V1774H380Z" style="fill: var(--scene-hill-near)" />
    <g style="fill: var(--scene-bush)">
      <path d="M-70 1774V1652C-48 1608 2 1588 44 1600C74 1608 92 1632 98 1652C112 1622 150 1602 182 1616C206 1628 212 1654 208 1684V1774Z" />
      <path d="M-520 1774V1690C-500 1650 -450 1636 -410 1652C-390 1620 -340 1610 -305 1632C-280 1646 -272 1672 -276 1700V1774Z" />
      <path d="M-1060 1774V1692C-1040 1656 -994 1642 -956 1656C-930 1630 -884 1626 -856 1648C-834 1666 -830 1690 -834 1712V1774Z" />
      <path d="M752 1774V1684C752 1646 782 1620 814 1626C820 1590 846 1562 887 1556V1774Z" />
    </g>
    <g style="fill: var(--scene-bush-teal)">
      <path d="M392 1700C390 1658 418 1626 452 1628C482 1632 494 1662 490 1700Z" />
      <path d="M-210 1774V1714C-196 1686 -164 1674 -136 1684C-112 1692 -102 1716 -104 1740V1774Z" />
      <path d="M-760 1774V1720C-744 1690 -708 1680 -680 1692C-658 1702 -650 1724 -652 1746V1774Z" />
    </g>

    <!-- The near ground, darkest, across the whole width. -->
    <path
      d="M-4000 1712C-1100 1672 -800 1690 -560 1700C-320 1710 -120 1676 0 1700C120 1662 252 1662 382 1702C462 1722 522 1742 562 1774H-4000Z"
      style="fill: var(--scene-ground)"
    />
    <path d="M300 1774C380 1720 482 1700 602 1720C682 1690 782 1652 887 1650V1774Z" style="fill: var(--scene-ground-deep)" />
  </svg>
</template>

<style>
/* The scene's colours, traced from the painting. A wrapper carrying
   .home-scene gives them to both halves; override any of them to recolour. */
.home-scene {
  --scene-sky-1: #74b6e6;
  --scene-sky-2: #98cff3;
  --scene-sky-3: #b8e1f4;
  --scene-sky-4: #dbedf1;
  --scene-horizon: #f8f5e6;
  --scene-glow: #fef6e3;
  --scene-pane: #a9d6f3;
  --scene-pane-dim: #6cb0e2;
  --scene-cloud: #f2f7f6;
  --scene-cloud-shade: #def0f9;
  --scene-cloud-warm: #fdf9ee;
  --scene-hill-far: #8fcee6;
  --scene-hill-back: #82c4e4;
  --scene-hill-left: #5eaade;
  --scene-hill-mid: #69b9d9;
  --scene-hill-near: #5cb0a0;
  --scene-bush: #1b7493;
  --scene-bush-teal: #2b8a9f;
  --scene-ground: #1d6f99;
  --scene-ground-deep: #18678d;
  --scene-church: #fbf8ef;
  --scene-church-side: #a9d3ec;
  --scene-trim: #cfe4e9;
  --scene-wing: #e3e6dd;
  --scene-roof: #4c77c0;
  --scene-roof-light: #6b8fd0;
  --scene-roof-under: #2f6db0;
  --scene-roof-wing: #2c84bd;
  --scene-cross: #4da2cc;
  --scene-glass: #ffd375;
  --scene-door: #22819b;
  /* The window's light, and how much of it shows: none by day. */
  --scene-window-light: #ffd27a;
  --scene-window-glow: 0;
}

/* Night: the same church at dusk, its window lit. */
.dark .home-scene {
  --scene-sky-1: #0b1628;
  --scene-sky-2: #11213a;
  --scene-sky-3: #182c4a;
  --scene-sky-4: #233756;
  --scene-horizon: #34364f;
  --scene-glow: #4a4152;
  --scene-pane: #2a4568;
  --scene-pane-dim: #0a1526;
  --scene-cloud: #2c3d5a;
  --scene-cloud-shade: #24344f;
  --scene-cloud-warm: #383a54;
  --scene-hill-far: #26476a;
  --scene-hill-back: #2a4c70;
  --scene-hill-left: #1c3a5b;
  --scene-hill-mid: #22456a;
  --scene-hill-near: #1d4f55;
  --scene-bush: #10304a;
  --scene-bush-teal: #15404f;
  --scene-ground: #0d2338;
  --scene-ground-deep: #0b1d30;
  --scene-church: #c9d2de;
  --scene-church-side: #5b7896;
  --scene-trim: #8ea3bb;
  --scene-wing: #a7b2c0;
  --scene-roof: #2c4a85;
  --scene-roof-light: #3b5c9b;
  --scene-roof-under: #1e3766;
  --scene-roof-wing: #24507f;
  --scene-cross: #5b9dff;
  --scene-glass: #ffcf6b;
  --scene-door: #143a52;
  --scene-window-light: #ffc861;
  --scene-window-glow: 0.55;
}
</style>
