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

// Ranks 1-50 are the main list (each level's own qualify %); 51 and below are legacy
const mainListLength = 50;

// ACL levels live in the normal /data folder; their order lives in /data/_acl.json
const dataFolder = "/data";
const aclListFile = dataFolder + "/_acl.json";

// This one file runs both lists: #/ is the ACCL, #/acl is the ACL
const listInfo = {
    accl: { shortName: "ACCL", fullName: "Ayaan Chicken Challenge List" },
    acl: { shortName: "ACL", fullName: "Ayaan Chicken List" },
};

// Every known level type, grouped by category (shown when you hover a type).
// To add a type: put it in the right group here, then use it in a level's "types" array.
// Types used in a level but missing from here still show up, labeled "Other" on hover.
const typeCatalog = {
    // Gamemode Based
    gamemode: [
        "Cube Based",
        "Ship Based",
        "Ball Based",
        "UFO Based",
        "Wave Based",
        "Robot Based",
        "Spider Based",
        "Swing Based",
        "Platformer Based",
        "Mini Cube Based",
        "Mini Ship Based",
        "Mini Ball Based",
        "Mini UFO Based",
        "Mini Wave Based",
        "Mini Robot Based",
        "Mini Spider Based",
        "Mini Swing Based",
        "Multi Gamemode",
        "Gamemode Switching",
        "Single Gamemode",
    ],

    // Skill Based
    skill: [
        "Consistency Based",
        "Timing Based",
        "Memory Based",
        "Reading Based",
        "Reaction Based",
        "Precision Based",
        "Straight Fly",
        "Spam Based",
        "Click Sync",
        "Rhythm Based",
        "Hold Based",
        "Release Based",
        "Buffer Based",
        "Double Click",
        "Triple Click",
        "Micro Clicks",
        "Tight Spacing",
        "Corridor Based",
        "Nerve Control",
        "Learny",
        "Hand Speed",
        "Mental Based",
        "Muscle Memory",
        "Endurance",
        "Flow Based",
        "Awkward Timing",
        "Jank Based",
        "One Click",
        "Low Click",
        "High Click",
    ],

    // Gimmick Based
    gimmick: [
        "Dual Based",
        "Mini Based",
        "Size Change",
        "Gravity Based",
        "Mirror Based",
        "Teleport Based",
        "Fake Path",
        "Speed Change Based",
        "Slow Speed",
        "Normal Speed",
        "Fast Speed",
        "Very Fast Speed",
        "Orb Based",
        "Pad Based",
        "Dash Orb Based",
        "Spider Orb Based",
        "Black Orb Based",
        "Green Orb Based",
        "Toggle Orb",
        "Teleport Orb",
        "Trigger Based",
        "Moving Objects",
        "Rotating Objects",
        "Saw Based",
        "Spike Based",
        "Slope Based",
        "Collision Based",
        "Keyframe Based",
        "Arrow Trigger",
        "Force Block Based",
        "Gimmick Based",
    ],

    // Visual Based
    visual: [
        "Low Visibility",
        "Invisible",
        "Hidden Spikes",
        "Invisible Blocks",
        "Flashy",
        "Blinding",
        "Effect Heavy",
        "Particle Heavy",
        "Pulse Based",
        "Shake Based",
        "Zoom Based",
        "Camera Based",
        "Rotated Camera",
        "Flip Camera",
        "Static Camera",
        "Fade Based",
        "Dark",
        "Monochrome",
        "Glow Based",
        "Color Swap",
        "Clutter",
        "Misleading Deco",
        "Layout",
        "Decorated",
    ],

    // Style
    style: [
        "Nine Circles",
        "Tryhard",
        "Wave Spam",
        "Spam Challenge",
        "Nerfed",
        "Buffed",
        "Remake",
        "Recreation",
        "Sync",
        "Unsynced",
        "Gameplay",
        "Classic",
        "Modern",
        "Retro",
        "1.9 Style",
        "2.0 Style",
        "2.1 Style",
        "2.2 Style",
        "Bossfight",
        "Troll",
        "Meme",
        "Impossible-Feeling",
        "Fun",
        "Annoying",
        "Collab",
        "Solo",
        "Copyable",
        "Chicken Certified",
    ],
};

// Shown when you hover a type
const typeCategoryLabels = {
    gamemode: "Gamemode Based",
    skill: "Skill Based",
    gimmick: "Gimmick Based",
    visual: "Visual Based",
    style: "Style",
    other: "Other",
};

// Lowercase type name → category, built from the catalog above
const typeCategoryMap = {};
for (const [categoryName, typeNames] of Object.entries(typeCatalog)) {
    for (const typeName of typeNames) {
        typeCategoryMap[typeName.toLowerCase()] = categoryName;
    }
}

// Extra styles for the search box, dividers, badges, copy buttons and the type list.
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
    /* Top 3 ranks get the same chunky offset shadow as the logo */
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

    /* Type section: plain text, same as the ID and Password next to it */
    .page-list .type-list {
        max-width: 280px;
    }
    .page-list .type-list .type-name + .type-name::before {
        content: ", ";
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

// Loads the ACL the same way content.js loads the ACCL: [level, error] pairs.
// No _acl.json yet = an empty ACL instead of an error.
async function fetchAclList() {
    try {
        const listResponse = await fetch(aclListFile);
        if (listResponse.status === 404) return [];
        if (!listResponse.ok) throw new Error("ACL list request failed");

        const levelPaths = await listResponse.json();
        return await Promise.all(
            levelPaths.map(async (levelPath, rankIndex) => {
                try {
                    const levelResponse = await fetch(dataFolder + "/" + levelPath + ".json");
                    const levelData = await levelResponse.json();
                    const levelRecords = Array.isArray(levelData.records)
                        ? [...levelData.records].sort((recordA, recordB) => recordB.percent - recordA.percent)
                        : [];
                    return [{ ...levelData, path: levelPath, records: levelRecords }, null];
                } catch (levelError) {
                    console.error("Failed to load ACL level #" + (rankIndex + 1) + " " + levelPath + ".");
                    return [null, levelPath];
                }
            }),
        );
    } catch (listError) {
        console.error("Failed to load the ACL.");
        return null;
    }
}

// fetchList() gives back [level, error] pairs; this also accepts plain level objects
function unwrapLevel(entry) {
    if (Array.isArray(entry)) return entry[0] || null;
    return entry || null;
}

function sectionForIndex(index) {
    if (index < mainListLength) return { label: "Main list", badgeClass: "" };
    return { label: "Legacy list", badgeClass: "badge-legacy" };
}

// Turns a level's "types" (array or single string) into a clean, de-duplicated list
function buildLevelTypes(rawTypes) {
    if (rawTypes === undefined || rawTypes === null) return [];
    const typeList = Array.isArray(rawTypes) ? rawTypes : [rawTypes];
    const seenTypes = new Set();
    const levelTypes = [];

    for (const rawType of typeList) {
        const typeName = String(rawType).trim();
        if (!typeName) continue;

        const typeKey = typeName.toLowerCase();
        if (seenTypes.has(typeKey)) continue;
        seenTypes.add(typeKey);

        levelTypes.push({
            name: typeName,
            category: typeCategoryMap[typeKey] || "other",
        });
    }
    return levelTypes;
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
                        :placeholder="'Search ' + currentList.shortName + ' levels or #rank'"
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
                    <p>No levels on the {{ currentList.shortName }} yet.</p>
                </div>
            </div>
            <div class="level-container" ref="levelContainer">
                <div class="level level-swap" v-if="level" :key="'panel-' + selected">
                    <div class="level-heading">
                        <span class="level-badge" :class="currentSection.badgeClass">
                            {{ isMainList ? '#' + (selected + 1) + ' ' : '' }}{{ currentSection.label }}
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
                            <p>{{ isMainList ? score(selected + 1, 100, level.percentToQualify || 100) : 0 }}</p>
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
                        <li v-if="levelTypes.length > 0">
                            <div class="type-title-sm">Type</div>
                            <p class="type-list"><span
                                v-for="levelType in levelTypes"
                                :key="'type-' + levelType.name"
                                class="type-name"
                                :title="typeCategoryLabels[levelType.category]"
                            >{{ levelType.name }}</span></p>
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
                    <p v-if="isMainList"><strong>{{ level.percentToQualify || 100 }}%</strong> or better to qualify</p>
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
                    <p v-else-if="isMainList" class="empty-note">No records yet. Be the first to beat it!</p>
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
                    <p v-if="listKey === 'acl'">The level can be any length</p>
                    <p v-else>The level cannot be above 1 minute</p>
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
        loadCounter: 0,
        roleIconMap,
        typeCategoryLabels,
        mainListLength,
        store,
    }),
    computed: {
        listKey() {
            return this.$route && this.$route.path.startsWith("/acl") ? "acl" : "accl";
        },
        currentList() {
            return listInfo[this.listKey];
        },
        listBasePath() {
            return this.listKey === "acl" ? "/acl" : "/";
        },
        isMainList() {
            return this.selected < mainListLength;
        },
        levelRows() {
            return this.list.map((entry, index) => {
                return {
                    index,
                    level: unwrapLevel(entry),
                    rankLabel: index < mainListLength ? "#" + (index + 1) : "Legacy",
                    dividerLabel: index === mainListLength ? "Legacy list" : "",
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
        levelTypes() {
            return this.level ? buildLevelTypes(this.level.types) : [];
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

            // Keep the selected level in the URL so links like #/acl?level=5 open straight to it
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
        // Safety net: if the page ever switches lists without reloading, load the new list
        listKey() {
            this.loadList();
        },
    },
    async mounted() {
        injectListStyles();
        window.addEventListener("keydown", this.handleKeydown);
        await this.loadList();
    },
    beforeUnmount() {
        window.removeEventListener("keydown", this.handleKeydown);
        clearTimeout(this.copyTimer);
    },
    methods: {
        embed,
        score,
        async loadList() {
            // If lists get switched mid-load, only the newest load is kept
            this.loadCounter += 1;
            const thisLoad = this.loadCounter;
            const listKey = this.listKey;

            this.loading = true;
            this.errors = [];
            this.searchQuery = "";

            const [list, editors] = await Promise.all([
                listKey === "acl" ? fetchAclList() : fetchList(),
                fetchEditors(),
            ]);
            if (thisLoad !== this.loadCounter) return;

            if (Array.isArray(list)) {
                this.list = list;
                const failedLevels = list
                    .filter((entry) => Array.isArray(entry) && entry[1])
                    .map((entry) => "Failed to load level. (" + entry[1] + ".json)");
                this.errors.push(...failedLevels);
            } else {
                this.list = [];
                this.errors.push("Failed to load the " + listInfo[listKey].shortName + ". Notify list staff.");
            }

            if (Array.isArray(editors)) {
                this.editors = editors;
            } else {
                this.editors = [];
                this.errors.push("Failed to load list editors.");
            }

            const linkedRank = parseInt(this.$route && this.$route.query.level, 10);
            this.selected = linkedRank >= 1 && linkedRank <= this.list.length ? linkedRank - 1 : 0;

            this.loading = false;
            this.$nextTick(() => this.scrollActiveIntoView());
        },
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
            // Links to the right list: #/?level=5 for the ACCL, #/acl?level=5 for the ACL
            const levelQuery = { level: String(this.selected + 1) };
            const routeHref = this.$router
                ? this.$router.resolve({ path: this.listBasePath, query: levelQuery }).href
                : "#" + this.listBasePath + "?level=" + levelQuery.level;
            const fullLink = new URL(routeHref, window.location.href).href;

            const didCopy = await copyToClipboard(fullLink);
            if (didCopy) this.flashCopied("link");
        },
    },
};