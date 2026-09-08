<template>
    <div>
        <div v-if="settingsLoaded" class="my-4">
            <!-- Change Password -->
            <template v-if="!settings.disableAuth">
                <p>
                    <button
                        v-if="!settings.disableAuth"
                        id="logout-btn"
                        class="btn btn-danger ms-4 me-2 mb-2"
                        @click="$root.logout"
                    >
                        {{ $t("logoutCurrentUser", { username: $root.username }) }}
                    </button>
                </p>

                <h5 class="my-4 settings-subheading">{{ $t("Change Password") }}</h5>
                <form class="mb-3" @submit.prevent="savePassword">
                    <div class="mb-3">
                        <label for="current-password" class="form-label">
                            {{ $t("Current Password") }}
                        </label>
                        <input
                            id="current-password"
                            v-model="password.currentPassword"
                            type="password"
                            class="form-control"
                            autocomplete="current-password"
                            required
                        />
                    </div>

                    <div class="mb-3">
                        <label for="new-password" class="form-label">
                            {{ $t("New Password") }}
                        </label>
                        <input
                            id="new-password"
                            v-model="password.newPassword"
                            type="password"
                            class="form-control"
                            autocomplete="new-password"
                            required
                        />
                    </div>

                    <div class="mb-3">
                        <label for="repeat-new-password" class="form-label">
                            {{ $t("Repeat New Password") }}
                        </label>
                        <input
                            id="repeat-new-password"
                            v-model="password.repeatNewPassword"
                            type="password"
                            class="form-control"
                            :class="{ 'is-invalid': invalidPassword }"
                            autocomplete="new-password"
                            required
                        />
                        <div class="invalid-feedback">
                            {{ $t("passwordNotMatchMsg") }}
                        </div>
                    </div>

                    <div>
                        <button class="btn btn-primary" type="submit">
                            {{ $t("Update Password") }}
                        </button>
                    </div>
                </form>
            </template>

            <!-- 2FA Settings -->
            <div v-if="!settings.disableAuth" class="mt-5 mb-3">
                <h5 class="my-4 settings-subheading">
                    {{ $t("Two Factor Authentication") }}
                </h5>
                <div class="mb-4">
                    <button class="btn btn-primary me-2" type="button" @click="$refs.TwoFADialog.show()">
                        {{ $t("2FA Settings") }}
                    </button>
                </div>
            </div>

            <!-- بخش مدیریت کاربران (کاملاً بومی با تم Uptime Kuma) -->
            <div v-if="!settings.disableAuth" class="mt-5 mb-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="settings-subheading mb-0">{{ $t("User Management") }}</h5>
                    <button class="btn btn-primary btn-sm" type="button" @click="showAddUser = !showAddUser">
                        <font-awesome-icon icon="plus" class="me-1" /> {{ $t("Add New User") }}
                    </button>
                </div>

                <!-- فرم افزودن کاربر با پس‌زمینه دارک هماهنگ -->
                <transition name="slide-fade">
                    <div v-if="showAddUser" class="shadow-box p-3 mb-4 user-form-card">
                        <h6 class="mb-3 fw-bold">{{ $t("Add User") }}</h6>
                        <form @submit.prevent="addUser">
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <label class="form-label">{{ $t("Username") }}</label>
                                    <input v-model="newUser.username" type="text" class="form-control" required autocomplete="off" />
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">{{ $t("Password") }}</label>
                                    <input v-model="newUser.password" type="password" class="form-control" required autocomplete="new-password" />
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">{{ $t("Role") }}</label>
                                    <select v-model="newUser.role" class="form-select">
                                        <option value="admin">Admin (Full Access)</option>
                                        <option value="editor">Editor (Can edit monitors)</option>
                                        <option value="viewer">Viewer (Read-Only)</option>
                                    </select>
                                </div>
                            </div>
                            <div class="mt-3 text-end">
                                <button type="button" class="btn btn-normal btn-sm me-2" @click="showAddUser = false">
                                    {{ $t("Cancel") }}
                                </button>
                                <button type="submit" class="btn btn-primary btn-sm">
                                    {{ $t("Save") }}
                                </button>
                            </div>
                        </form>
                    </div>
                </transition>

                <!-- جدول لیست کاربران منطبق با تم سیستم -->
                <table class="table table-borderless table-hover user-table mt-3">
                    <thead>
                        <tr>
                            <th>{{ $t("Username") }}</th>
                            <th>{{ $t("Role") }}</th>
                            <th class="text-end">{{ $t("Actions") }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="u in userList" :key="u.id">
                            <td class="align-middle fw-bold">{{ u.username }}</td>
                            <td class="align-middle">
                                <span class="badge rounded-pill text-uppercase px-2 py-1" :class="getRoleBadgeClass(u.role)">
                                    {{ u.role || 'admin' }}
                                </span>
                            </td>
                            <td class="text-end align-middle">
                                <button 
                                    v-if="u.username !== $root.username" 
                                    class="btn btn-outline-danger btn-sm" 
                                    type="button"
                                    @click="deleteUser(u.id)"
                                >
                                    <font-awesome-icon icon="trash" /> {{ $t("Delete") }}
                                </button>
                                <span v-else class="text-secondary small fst-italic me-2">
                                    ({{ $t("Current User") }})
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Advanced -->
            <div class="my-4">
                <h5 class="my-4 settings-subheading">{{ $t("Advanced") }}</h5>

                <div class="mb-4">
                    <button
                        v-if="settings.disableAuth"
                        id="enableAuth-btn"
                        class="btn btn-outline-primary me-2 mb-2"
                        @click="enableAuth"
                    >
                        {{ $t("Enable Auth") }}
                    </button>
                    <button
                        v-if="!settings.disableAuth"
                        id="disableAuth-btn"
                        class="btn btn-primary me-2 mb-2"
                        @click="confirmDisableAuth"
                    >
                        {{ $t("Disable Auth") }}
                    </button>
                </div>
            </div>
        </div>

        <TwoFADialog ref="TwoFADialog" />

        <Confirm
            ref="confirmDisableAuth"
            btn-style="btn-danger"
            :yes-text="$t('I understand, please disable')"
            :no-text="$t('Leave')"
            @yes="disableAuth"
        >
            <i18n-t tag="p" keypath="disableauth.message1">
                <template #disableAuth>
                    <strong>{{ $t("disable authentication") }}</strong>
                </template>
            </i18n-t>
            <i18n-t tag="p" keypath="disableauth.message2">
                <template #intendThirdPartyAuth>
                    <strong>{{ $t("where you intend to implement third-party authentication") }}</strong>
                </template>
            </i18n-t>
            <p>{{ $t("Please use this option carefully!") }}</p>

            <div class="mb-3">
                <label for="current-password2" class="form-label">
                    {{ $t("Current Password") }}
                </label>
                <input
                    id="current-password2"
                    v-model="password.currentPassword"
                    type="password"
                    class="form-control"
                    required
                />
            </div>
        </Confirm>
    </div>
</template>

<script>
import Confirm from "../../components/Confirm.vue";
import TwoFADialog from "../../components/TwoFADialog.vue";

export default {
    components: {
        Confirm,
        TwoFADialog,
    },

    data() {
        return {
            invalidPassword: false,
            password: {
                currentPassword: "",
                newPassword: "",
                repeatNewPassword: "",
            },
            userList: [],
            showAddUser: false,
            newUser: {
                username: "",
                password: "",
                role: "viewer",
            },
        };
    },

    computed: {
        settings() {
            return this.$parent.$parent.$parent.settings;
        },
        saveSettings() {
            return this.$parent.$parent.$parent.saveSettings;
        },
        settingsLoaded() {
            return this.$parent.$parent.$parent.settingsLoaded;
        },
    },

    watch: {
        "password.repeatNewPassword"() {
            this.invalidPassword = false;
        },
    },

    mounted() {
        this.getUserList();
    },

    methods: {
        getRoleBadgeClass(role) {
            if (role === "admin") {
                return "bg-danger";
            } else if (role === "editor") {
                return "bg-warning text-dark";
            } else {
                return "bg-info text-dark";
            }
        },

        savePassword() {
            if (this.password.newPassword !== this.password.repeatNewPassword) {
                this.invalidPassword = true;
            } else {
                this.$root.getSocket().emit("changePassword", this.password, (res) => {
                    this.$root.toastRes(res);
                    if (res.ok) {
                        this.password.currentPassword = "";
                        this.password.newPassword = "";
                        this.password.repeatNewPassword = "";

                        if (res.token) {
                            this.$root.storage().token = res.token;
                            this.$root.socket.token = res.token;
                        }
                    }
                });
            }
        },

        getUserList() {
            this.$root.getSocket().emit("getUserList", (res) => {
                if (res.ok) {
                    this.userList = res.data;
                }
            });
        },

        addUser() {
            this.$root.getSocket().emit("addUser", this.newUser, (res) => {
                this.$root.toastRes(res);
                if (res.ok) {
                    this.showAddUser = false;
                    this.newUser.username = "";
                    this.newUser.password = "";
                    this.newUser.role = "viewer";
                    this.getUserList();
                }
            });
        },

        deleteUser(userID) {
            if (confirm("Are you sure you want to delete this user?")) {
                this.$root.getSocket().emit("deleteUser", userID, (res) => {
                    this.$root.toastRes(res);
                    if (res.ok) {
                        this.getUserList();
                    }
                });
            }
        },

        disableAuth() {
            this.settings.disableAuth = true;
            this.saveSettings(() => {
                this.password.currentPassword = "";
                this.$root.username = null;
                this.$root.socket.token = "autoLogin";
            }, this.password.currentPassword);
        },

        enableAuth() {
            this.settings.disableAuth = false;
            this.saveSettings();
            this.$root.storage().removeItem("token");
            location.reload();
        },

        confirmDisableAuth() {
            this.$refs.confirmDisableAuth.show();
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../../assets/vars.scss";

.user-form-card {
    border: 1px solid rgba(0, 0, 0, 0.1);
    background-color: #fff;

    .dark & {
        background-color: $dark-header-bg;
        border-color: $dark-border-color;
    }
}

.user-table {
    thead th {
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: $secondary-text;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);

        .dark & {
            border-bottom-color: $dark-border-color;
        }
    }

    tbody tr {
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);

        .dark & {
            border-bottom-color: rgba(255, 255, 255, 0.05);
        }
    }
}
</style>