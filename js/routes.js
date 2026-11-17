export default [
    { path: '/', component: () => import(`./pages/List.js?t=${Date.now()}`) },
    // Same List.js as the ACCL; it sees /acl and loads the Ayaan Chicken List instead
    { path: '/acl', component: () => import(`./pages/List.js?t=${Date.now()}`) },
    { path: '/leaderboard', component: () => import(`./pages/Leaderboard.js?t=${Date.now()}`) },
    { path: '/roulette', component: () => import(`./pages/Roulette.js?t=${Date.now()}`) },
];