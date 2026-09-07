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

            <!-- بخش جدید: مدیریت کاربران و نقش‌ها (RBAC) -->
            <div v-if="!settings.disableAuth" class="mt-5 mb-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="my-4 settings-subheading mb-0">مدیریت کاربران و سطح دسترسی (RBAC)</h5>
                    <button class="btn btn-outline-primary btn-sm" type="button" @click="showAddUser = !showAddUser">
                        <font-awesome-icon icon="plus" /> افزودن کاربر جدید
                    </button>
                </div>

                <!-- فرم افزودن کاربر جدید -->
                <transition name="slide-fade">
                    <div v-if="showAddUser" class="card shadow-sm mb-4 p-3 border-0 bg-light-subtle">
                        <h6 class="mb-3">تعریف کاربر جدید</h6>
                        <form @submit.prevent="addUser">
                            <div class="row g-2">
                                <div class="col-md-4 mb-2">
                                    <label class="form-label">نام کاربری</label>
                                    <input v-model="newUser.username" type="text" class="form-control form-control-sm" required />
                                </div>
                                <div class="col-md-4 mb-2">
                                    <label class="form-label">رمز عبور</label>
                                    <input v-model="newUser.password" type="password" class="form-control form-control-sm" required />
                                </div>
                                <div class="col-md-4 mb-2">
                                    <label class="form-label">نقش (Role)</label>
                                    <select v-model="newUser.role" class="form-select form-select-sm">
                                        <option value="admin">Admin (دسترسی کامل)</option>
                                        <option value="editor">Editor (مدیریت مانیتورها)</option>
                                        <option value="viewer">Viewer (فقط مشاهده)</option>
                                    </select>
                                </div>
                            </div>
                            <div class="mt-2 text-end">
                                <button type="button" class="btn btn-secondary btn-sm me-2" @click="showAddUser = false">انصراف</button>
                                <button type="submit" class="btn btn-primary btn-sm">ایجاد کاربر</button>
                            </div>
                        </form>
                    </div>
                </transition>

                <!-- جدول لیست کاربران -->
                <div class="table-responsive">
                    <table class="table table-borderless table-hover">
                        <thead class="table-light">
                            <tr>
                                <th>نام کاربری</th>
                                <th>نقش (Role)</th>
                                <th class="text-end">عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="u in userList" :key="u.id">
                                <td class="align-middle fw-bold">{{ u.username }}</td>
                                <td class="align-middle">
                                    <span class="badge text-uppercase" :class="{
                                        'bg-danger': u.role === 'admin',
                                        'bg-warning text-dark': u.role === 'editor',
                                        'bg-info text-dark': u.role === 'viewer'
                                    }">
                                        {{ u.role || 'admin' }}
                                    </span>
                                </td>
                                <td class="text-end">
                                    <button 
                                        v-if="u.username !== $root.username" 
                                        class="btn btn-outline-danger btn-sm" 
                                        @click="deleteUser(u.id)"
                                    >
                                        <font-awesome-icon icon="trash" /> حذف
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="my-4">
                <!-- Advanced -->
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
            // RBAC States
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

        // متدهای مدیریت کاربر RBAC
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
            if (confirm("آیا از حذف این کاربر اطمینان دارید؟")) {
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