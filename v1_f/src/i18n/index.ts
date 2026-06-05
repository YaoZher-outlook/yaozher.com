import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  'zh-CN': {
    translation: {
      nav: {
        home: '首页',
        download: '资源',
        messages: '消息',
        settings: '设置',
      },
      user: {
        login: '登录',
        logout: '退出登录',
        guest: '访客',
      },
      music: {
        toggle: '音乐',
      },
      settings: {
        language: '语言',
        theme: '主题',
        led: '灯光',
      },
    },
  },
  'en-US': {
    translation: {
      nav: {
        home: 'Home',
        download: 'Resources',
        messages: 'Messages',
        settings: 'Settings',
      },
      user: {
        login: 'Login',
        logout: 'Logout',
        guest: 'Guest',
      },
      music: {
        toggle: 'Music',
      },
      settings: {
        language: 'Language',
        theme: 'Theme',
        led: 'Lighting',
      },
    },
  },
} as const

export function initI18n() {
  if (i18n.isInitialized) return i18n

  i18n.use(initReactI18next).init({
    resources,
    lng: 'zh-CN',
    fallbackLng: 'en-US',
    interpolation: { escapeValue: false },
  })

  return i18n
}

export default i18n
