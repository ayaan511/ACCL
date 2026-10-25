import routes from './routes.js';

// Enforce programmatic asset updates for client-side ES Modules
const APP_VERSION = '1.0.6';
if (localStorage.getItem('accl_version') !== APP_VERSION) {
    localStorage.clear();
    localStorage.setItem('accl_version', APP_VERSION);
    window.location.reload();
}

export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
});

const app = Vue.createApp({
    data: () => ({ store }),
});

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

app.use(router);

app.mount('#app');
