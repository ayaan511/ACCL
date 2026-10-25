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

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <div class="list-container">
                <table class="list" v-if="Array.isArray(list) && list.length > 0">
                    <tbody>
                        <tr v-for="(entry, i) in list" :key="'level-' + i" :class="{ 'active': selected == i }">
                            <td class="rank">
                                <p v-if="i + 1 <= 150" class="type-label-lg">#{{ i + 1 }}</p>
                                <p v-else class="type-label-lg">Legacy</p>
                            </td>
                            <td class="level">
                                <button @click="selected = i">
                                    <span class="type-label-lg">{{ entry ? entry.name : 'Error' }}</span>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div v-else class="level" style="padding: 20px; text-align: center;">
                    <p>No levels indexed in the active tracking sequence.</p>
                </div>
            </div>
            <div class="level-container">
                <div class="level" v-if="level">
                    <h1>{{ level.name || 'Unnamed Challenge' }}</h1>
                    <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier"></LevelAuthors>
                    <iframe v-if="video" class="video" id="videoframe" :src="video" frameborder="0" allow="autoplay; encrypted-media; fullscreen"></iframe>
                    <ul class="stats">
                        <li>
                            <div class="type-title-sm">Points when completed</div>
                            <p>{{ score(selected + 1, 100, level.percentToQualify || 100) }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">ID</div>
                            <p>{{ level.id || 'N/A' }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Password</div>
                            <p>{{ level.password || 'Free to Copy' }}</p>
                        </li>
                    </ul>
                    <h2>Records</h2>
                    <p v-if="selected + 1 <= 75"><strong>{{ level.percentToQualify || 100 }}%</strong> or better to qualify</p>
                    <p v-else-if="selected + 1 <= 150"><strong>100%</strong> or better to qualify</p>
                    <p v-else>This level does not accept new records.</p>
                    <table class="records" v-if="Array.isArray(level.records) && level.records.length > 0">
                        <tbody>
                            <tr v-for="(record, rIdx) in level.records" :key="'record-' + rIdx" class="record">
                                <td class="percent">
                                    <p>{{ record.percent }}%</p>
                                </td>
                                <td class="user">
                                    <a :href="record.link" target="_blank" class="type-label-lg">{{ record.user }}</a>
                                </td>
                                <td class="mobile">
                                    <img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile">
                                </td>
                                <td class="hz">
                                    <p>{{ record.hz }}Hz</p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <p v-else style="margin-top: 15px; color: #777;">No records submitted yet for this challenge.</p>
                </div>
                <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                    <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                </div>
            </div>
            <div class="meta-container">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors">{{ error }}</p>
                    </div>
                    <template v-if="editors && editors.length > 0">
                        <h3>List Editors</h3>
                        <ol class="editors">
                            <li v-for="(editor, eIdx) in editors" :key="'editor-' + eIdx">
                                <img :src="\`/assets/\${roleIconMap[editor.role]}\${store.dark ? '-dark' : ''}.svg\`" :alt="editor.role">
                                <a v-if="editor.link" class="type-label-lg link" target="_blank" :href="editor.link">{{ editor.name }}</a>
                                <p v-else>{{ editor.name }}</p>
                            </li>
                        </ol>
                    </template>
                    <h3>Submission Requirements</h3>
                    <p>Achieved the record without using hacks</p>
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
        roleIconMap,
        store
    }),
    computed: {
        level() {
            if (!Array.isArray(this.list) || this.list.length === 0 || !this.list[this.selected]) {
                return null;
            }
            return this.list[this.selected][0] || this.list[this.selected];
        },
        video() {
            if (!this.level || !this.level.verification) return '';
            // Cleaned up logic natively uses the updated embed function from util.js
            return embed(this.level.verification);
        },
    },
    async mounted() {
        this.list = await fetchList();
        this.editors = await fetchEditors();

        if (!this.list || !Array.isArray(this.list)) {
            this.list = [];
            this.errors = ["Failed to load list. Notify list staff."];
        } else {
            if (!this.editors) {
                this.errors.push("Failed to load list editors.");
            }
        }
        this.loading = false;
    },
    methods: {
        embed,
        score,
    },
};
