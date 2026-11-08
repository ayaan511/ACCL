import { store } from "../main.js";
import { embed } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList } from "../content.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock",
};

// Ranks 1-75 use the level's own qualify %, 76-150 need 100%, 151+ is legacy
const mainListLength = 75;
const extendedListLength = 150;

// Extra styles for the search box, dividers, badges and copy buttons.
// Injected once so this page stays a single drop-in file.
const listStyleId = "accl-list-styles";
const listStyles = `
    .page-list .list-search {
        padding-bottom: 12px;
    }
    .page-list .list-search input {
        width: 100%;
        box-sizing: border-box;
        padding: 10px 16px;
        border-radius: 999px;
        border: 1px solid rgba(128, 128, 128, 0.35);
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: 0.9rem;
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
    }
    .page-list .list-search input:focus {
        border-color: #ffc93c;
        box-shadow: 0 0 0 3px rgba(255, 201, 60, 0.25);
    }
    .page-list .list-search input::placeholder {
        color: inherit;
        opacity: 0.5;
    }
    .page-list .list-search__count {
        margin-top: 8px;
        padding-left: 16px;
        font-size: 0.78rem;
        opacity: 0.6;
    }

    /* Selected row: yellow bar on the left + a faint tint */
    .page-list .list tr.active td.level {
        box-shadow: inset 3px 0 0 #ffc93c;
        background: rgba(255, 201, 60, 0.08);
    }
    .page-list .list tr.broken .type-label-lg {
        opacity: 0.5;
        font-style: italic;
    }
    /* Top 3 ranks get the same chunky offset shadow as the ACCL logo */
    .page-list .list td.rank.rank-top p {
        text-shadow: 2px 2px 0 #ffc93c;
    }
    .page-list .list-divider td {
        padding: 18px 0 6px;
    }
    .page-list .list-divider p {
        font-size: 0.8rem;
        opacity: 0.55;
    }
    .page-list .list-empty {
        padding: 20px;
        text-align: center;
        opacity: 0.65;
    }

    /* Level panel: a quick slide-in when you pick a different level */
    .page-list .level-swap {
        animation: levelSwapIn 0.18s ease-out;
    }
    @keyframes levelSwapIn {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: none; }
    }
    .page-list .level-heading {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 4px;
    }
    .page-list .level-badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 999px;
        font-size: 0.75rem;
        background: #ffc93c;
        color: #1d1d1d;
        box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.18);
    }
    .page-list .level-badge.badge-extended {
        background: #ff8a00;
    }
    .page-list .level-badge.badge-legacy {
        background: rgba(128, 128, 128, 0.35);
        color: inherit;
        box-shadow: none;
    }
    .page-list .share-button {
        all: unset;
        margin-left: auto;
        padding: 4px 12px;
        border-radius: 999px;
        border: 1px solid rgba(128, 128, 128, 0.4);
        font-size: 0.78rem;
        cursor: pointer;
        transition: border-color 0.15s;
    }
    .page-list .share-button:hover {
        border-color: #ffc93c;
    }
    .page-list .share-button:focus-visible {
        outline: 2px solid #ffc93c;
        outline-offset: 2px;
    }

    .page-list .stat-copy {
        all: unset;
        cursor: copy;
        border-bottom: 1px dashed rgba(128, 128, 128, 0.6);
    }
    .page-list .stat-copy:hover {
        border-bottom-color: #ffc93c;
    }
    .page-list .stat-copy:focus-visible {
        outline: 2px solid #ffc93c;
        outline-offset: 2px;
    }

    .page-list .records-count {
        font-size: 0.8em;
        opacity: 0.5;
    }
    /* Full 100% completions stand out from progress records */
    .page-list .record.record-full .percent p {
        font-weight: 700;
        color: #e0a100;
    }
    .page-list.dark .record.record-full .percent p {
        color: #ffc93c;
    }

    .page-list .empty-note {
        margin-top: 15px;
        opacity: 0.6;
    }
    .page-list .level-missing {
        height: 100%;
        justify-content: center;
        align-items: center;
        gap: 8px;
        opacity: 0.7;
    }
`;

function injectListStyles() {
    if (document.getElementById(listStyleId)) return;
    const styleTag = document.createElement("style");
    styleTag.id = listStyleId;
    styleTag.textContent = listStyles;
    document.head.appendChild(styleTag);
}

// fetchList() gives back [level, error] pairs; this also accepts plain level objects
function unwrapLevel(entry) {
    if (Array.isArray(entry)) return entry[0] || null;
    return entry || null;
}

function sectionForIndex(index) {
    if (index < mainListLength) return { label: "Main list", badgeClass: "" };
    if (index < extendedListLength) return { label: "Extended list", badgeClass: "badge-extended" };
    return { label: "Legacy list", badgeClass: "badge-legacy" };
}

// Clipboard API first; the hidden-textarea trick covers http:// and older browsers
async function copyToClipboard(textValue) {
    try {
        await navigator.clipboard.writeText(textValue);
        return true;
    } catch (clipboardError) {
        const helperBox = document.createElement("textarea");
        helperBox.value = textValue;
        helperBox.setAttribute("readonly", "");
        helperBox.style.position = "fixed";
        helperBox.style.opacity = "0";
        document.body.appendChild(helperBox);
        helperBox.select();
        let didCopy = false;
        try {
            didCopy = document.execCommand("copy");
        } catch (execError) {
            didCopy = false;
        }
        helperBox.remove();
        return didCopy;
    }
}

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="list-container">
                <div class="list-search">
                    <input
                        ref="searchInput"
                        v-model.trim="searchQuery"
                        type="search"
                        placeholder="Search levels or #rank"
                        aria-label="Search levels"
                        title="Press / to search, Enter to open the first match"
                        @keydown.esc="clearSearch"
                        @keydown.enter.prevent="pickFirstResult"
                    >
                    <p v-if="searchQuery" class="list-search__count" aria-live="polite">
                        {{ visibleRows.length }} of {{ list.length }} levels
                    </p>
                </div>
                <table class="list" v-if="visibleRows.length > 0">
                    <tbody>
                        <template v-for="row in visibleRows" :key="'level-' + row.index">
                            <tr v-if="row.dividerLabel" class="list-divider">
                                <td colspan="2">
                                    <p class="type-label-lg">{{ row.dividerLabel }}</p>
                                </td>
                            </tr>
                            <tr :class="{ active: selected === row.index, broken: !row.level }">
                                <td class="rank" :class="{ 'rank-top': row.index < 3 }">
                                    <p class="type-label-lg">{{ row.rankLabel }}</p>
                                </td>
                                <td class="level">
                                    <button
                                        type="button"
                                        :aria-current="selected === row.index ? 'true' : null"
                                        @click="selected = row.index"
                                    >
                                        <span class="type-label-lg">{{ row.level ? row.level.name : 'Failed to load' }}</span>
                                    </button>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
                <div v-else-if="searchQuery" class="list-empty">
                    <p>No levels match "{{ searchQuery }}". Try a shorter name or a rank like #5.</p>
                </div>
                <div v-else class="list-empty">
                    <p>No levels on the list yet.</p>
                </div>
            </div>
            <div class="level-container" ref="levelContainer">
                <div class="level level-swap" v-if="level" :key="'panel-' + selected">
                    <div class="level-heading">
                        <span class="level-badge" :class="currentSection.badgeClass">
                            {{ selected + 1 <= extendedListLength ? '#' + (selected + 1) + ' ' : '' }}{{ currentSection.label }}
                        </span>
                        <button type="button" class="share-button" title="Copy a link to this level" @click="copyLevelLink">
                            {{ copiedKey === 'link' ? 'Link copied!' : 'Copy link' }}
                        </button>
                    </div>
                    <h1>{{ level.name || 'Unnamed challenge' }}</h1>
                    <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier"></LevelAuthors>
                    <iframe
                        v-if="video"
                        class="video"
                        id="videoframe"
                        :src="video"
                        :title="(level.name || 'Level') + ' verification video'"
                        loading="lazy"
                        frameborder="0"
                        allow="autoplay; encrypted-media; fullscreen"
                        allowfullscreen
                    ></iframe>
                    <ul class="stats">
                        <li>
                            <div class="type-title-sm">Points when completed</div>
                            <p>{{ score(selected + 1, 100, level.percentToQualify || 100) }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">ID</div>
                            <p v-if="level.id">
                                <button type="button" class="stat-copy" title="Click to copy" @click="copyText(level.id, 'id')">
                                    {{ copiedKey === 'id' ? 'Copied!' : level.id }}
                                </button>
                            </p>
                            <p v-else>N/A</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Password</div>
                            <p v-if="copyablePassword">
                                <button type="button" class="stat-copy" title="Click to copy" @click="copyText(copyablePassword, 'password')">
                                    {{ copiedKey === 'password' ? 'Copied!' : copyablePassword }}
                                </button>
                            </p>
                            <p v-else>{{ level.password || 'Free to Copy' }}</p>
                        </li>
                    </ul>
                    <h2>
                        Records
                        <span v-if="recordList.length > 0" class="records-count">({{ recordList.length }})</span>
                    </h2>
                    <p v-if="selected + 1 <= mainListLength"><strong>{{ level.percentToQualify || 100 }}%</strong> or better to qualify</p>
                    <p v-else-if="selected + 1 <= extendedListLength"><strong>100%</strong> or better to qualify</p>
                    <p v-else>This level does not accept new records.</p>
                    <table class="records" v-if="recordList.length > 0">
                        <tbody>
                            <tr
                                v-for="(record, recordIndex) in recordList"
                                :key="'record-' + recordIndex"
                                class="record"
                                :class="{ 'record-full': Number(record.percent) >= 100 }"
                            >
                                <td class="percent">
                                    <p>{{ record.percent }}%</p>
                                </td>
                                <td class="user">
                                    <a
                                        v-if="record.link"
                                        :href="record.link"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="type-label-lg"
                                    >{{ record.user }}</a>
                                    <p v-else class="type-label-lg">{{ record.user }}</p>
                                </td>
                                <td class="mobile">
                                    <img
                                        v-if="record.mobile"
                                        :src="'/assets/phone-landscape' + (store.dark ? '-dark' : '') + '.svg'"
                                        alt="Mobile"
                                        title="Played on mobile"
                                    >
                                </td>
                                <td class="hz">
                                    <p v-if="record.hz">{{ record.hz }}Hz</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <p v-else-if="selected + 1 <= extendedListLength" class="empty-note">No records yet. Be the first to beat it!</p>
                    <p v-else class="empty-note">No records were set before this level moved to legacy.</p>
                </div>
                <div v-else class="level level-missing">
                    <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                    <p v-if="list.length > 0">This level failed to load.</p>
                </div>
            </div>
            <div class="meta-container">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="(error, errorIndex) in errors" :key="'error-' + errorIndex">{{ error }}</p>
                    </div>
                    <template v-if="editors.length > 0">
                        <h3>List Editors</h3>
                        <ol class="editors">
                            <li v-for="(editor, editorIndex) in editors" :key="'editor-' + editorIndex">
                                <img
                                    :src="'/assets/' + (roleIconMap[editor.role] || 'user-lock') + (store.dark ? '-dark' : '') + '.svg'"
                                    :alt="editor.role"
                                    :title="editor.role"
                                >
                                <a
                                    v-if="editor.link"
                                    class="type-label-lg link"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    :href="editor.link"
                                >{{ editor.name }}</a>
                                <p v-else>{{ editor.name }}</p>
                            </li>
                        </ol>
                    </template>
                    <h3>Submission Requirements</h3>
                    <p>Achieved the record without using hacks (FPS Bypass is allowed)</p>
                    <p>Achieved the record on the level that is listed on the site - please check the level ID before you submit a record</p>
                    <p>The recording must have a previous attempt and entire death animation shown before the completion, unless the completion is on the first attempt. Everyplay records are exempt from this</p>
                    <p>The recording must also show the player hit the endwall, or the completion will be invalidated.</p>
                    <p>Do not use secret routes or bug routes</p>
                    <p>Do not use easy modes, only a record of the unmodified level qualifies</p>
                    <p>Once a level falls onto the Legacy List, we accept records for it for 24 hours after it falls off, then afterwards we never accept records for said level</p>
                    <p>The level cannot be above 1 minute</p>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        list: [],
        editors: [],
        loading: true,
        selected: 0,
        errors: [],
        searchQuery: "",
        copiedKey: "",
        copyTimer: null,
        roleIconMap,
        mainListLength,
        extendedListLength,
        store,
    }),
    computed: {
        levelRows() {
            return this.list.map((entry, index) => {
                let dividerLabel = "";
                if (index === mainListLength) dividerLabel = "Extended list";
                if (index === extendedListLength) dividerLabel = "Legacy list";

                return {
                    index,
                    level: unwrapLevel(entry),
                    rankLabel: index + 1 <= extendedListLength ? "#" + (index + 1) : "Legacy",
                    dividerLabel,
                };
            });
        },
        visibleRows() {
            const searchText = this.searchQuery.toLowerCase();
            if (!searchText) return this.levelRows;

            const rankSearch = searchText.replace(/^#/, "");
            return this.levelRows
                .filter((row) => {
                    const levelName = row.level && row.level.name ? row.level.name.toLowerCase() : "";
                    return levelName.includes(searchText) || String(row.index + 1) === rankSearch;
                })
                .map((row) => ({ ...row, dividerLabel: "" }));
        },
        level() {
            const row = this.levelRows[this.selected];
            return row ? row.level : null;
        },
        currentSection() {
            return sectionForIndex(this.selected);
        },
        recordList() {
            return this.level && Array.isArray(this.level.records) ? this.level.records : [];
        },
        video() {
            if (!this.level || !this.level.verification) return "";
            return embed(this.level.verification);
        },
        copyablePassword() {
            if (!this.level || this.level.password === undefined || this.level.password === null) return "";
            const passwordText = String(this.level.password).trim();
            return /^\d+$/.test(passwordText) ? passwordText : "";
        },
    },
    watch: {
        selected(newIndex) {
            this.copiedKey = "";

            // Keep the selected level in the URL so links like #/?level=5 open straight to it
            if (this.$router) {
                this.$router
                    .replace({ query: { ...this.$route.query, level: String(newIndex + 1) } })
                    .catch(() => {});
            }

            this.$nextTick(() => {
                this.scrollActiveIntoView();
                if (this.$refs.levelContainer) this.$refs.levelContainer.scrollTop = 0;
            });
        },
    },
    async mounted() {
        injectListStyles();

        const [list, editors] = await Promise.all([fetchList(), fetchEditors()]);

        if (Array.isArray(list)) {
            this.list = list;
            const failedLevels = list
                .filter((entry) => Array.isArray(entry) && entry[1])
                .map((entry) => "Failed to load level. (" + entry[1] + ".json)");
            this.errors.push(...failedLevels);
        } else {
            this.list = [];
            this.errors.push("Failed to load list. Notify list staff.");
        }

        if (Array.isArray(editors)) {
            this.editors = editors;
        } else {
            this.editors = [];
            this.errors.push("Failed to load list editors.");
        }

        const linkedRank = parseInt(this.$route && this.$route.query.level, 10);
        if (linkedRank >= 1 && linkedRank <= this.list.length) {
            this.selected = linkedRank - 1;
        }

        this.loading = false;
        window.addEventListener("keydown", this.handleKeydown);
        this.$nextTick(() => this.scrollActiveIntoView());
    },
    beforeUnmount() {
        window.removeEventListener("keydown", this.handleKeydown);
        clearTimeout(this.copyTimer);
    },
    methods: {
        embed,
        score,
        handleKeydown(event) {
            if (event.ctrlKey || event.metaKey || event.altKey) return;

            const searchInput = this.$refs.searchInput;
            const isSearchBox = searchInput && event.target === searchInput;
            const isTyping =
                !isSearchBox &&
                event.target.closest &&
                event.target.closest("input, textarea, select, [contenteditable]");
            if (isTyping) return;

            if (event.key === "/" && !isSearchBox && searchInput) {
                event.preventDefault();
                searchInput.focus();
                return;
            }

            // Home / End jump to the first / last level (outside the search box)
            if (!isSearchBox && (event.key === "Home" || event.key === "End")) {
                const visibleIndexes = this.visibleRows.map((row) => row.index);
                if (visibleIndexes.length === 0) return;
                event.preventDefault();
                this.selected =
                    event.key === "Home" ? visibleIndexes[0] : visibleIndexes[visibleIndexes.length - 1];
                return;
            }

            let step = 0;
            if (event.key === "ArrowDown" || (!isSearchBox && event.key === "j")) step = 1;
            if (event.key === "ArrowUp" || (!isSearchBox && event.key === "k")) step = -1;
            if (step === 0) return;

            event.preventDefault();
            this.moveSelection(step);
        },
        moveSelection(step) {
            const visibleIndexes = this.visibleRows.map((row) => row.index);
            if (visibleIndexes.length === 0) return;

            const currentPosition = visibleIndexes.indexOf(this.selected);
            const nextPosition =
                currentPosition === -1
                    ? 0
                    : Math.min(Math.max(currentPosition + step, 0), visibleIndexes.length - 1);
            this.selected = visibleIndexes[nextPosition];
        },
        pickFirstResult() {
            if (this.visibleRows.length === 0) return;
            this.selected = this.visibleRows[0].index;
            if (this.$refs.searchInput) this.$refs.searchInput.blur();
        },
        scrollActiveIntoView() {
            if (!this.$el || !this.$el.querySelector) return;
            const activeRow = this.$el.querySelector(".list tr.active");
            if (activeRow) activeRow.scrollIntoView({ block: "nearest" });
        },
        clearSearch() {
            this.searchQuery = "";
            if (this.$refs.searchInput) this.$refs.searchInput.blur();
        },
        flashCopied(key) {
            this.copiedKey = key;
            clearTimeout(this.copyTimer);
            this.copyTimer = setTimeout(() => {
                this.copiedKey = "";
            }, 1200);
        },
        async copyText(value, key) {
            const didCopy = await copyToClipboard(String(value));
            if (didCopy) this.flashCopied(key);
        },
        async copyLevelLink() {
            // Works with both hash (#/?level=5) and normal (/?level=5) routing
            const levelQuery = { level: String(this.selected + 1) };
            const routeHref = this.$router
                ? this.$router.resolve({ path: "/", query: levelQuery }).href
                : "#/?level=" + levelQuery.level;
            const fullLink = new URL(routeHref, window.location.href).href;

            const didCopy = await copyToClipboard(fullLink);
            if (didCopy) this.flashCopied("link");
        },
    },
};