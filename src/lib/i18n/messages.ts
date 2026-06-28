export const defaultLocale = 'ko'

export const messages = {
  ko: {
    common: {
      productName: 'Orb One',
    },
    navigation: {
      login: '로그인',
    },
    auth: {
      login: {
        eyebrow: '계정 접근',
        title: '로그인',
        description: '서비스를 이용하시려면 로그인해 주세요.',
        emailLabel: '이메일',
        emailPlaceholder: 'user@example.com',
        passwordLabel: '비밀번호',
        passwordPlaceholder: '비밀번호를 입력하세요',
        submit: '로그인',
        backToHome: '홈으로 돌아가기',
      },
    },
  },
  en: {
    common: {
      productName: 'Orb One',
    },
    navigation: {
      login: 'Login',
    },
    auth: {
      login: {
        eyebrow: 'Account access',
        title: 'Log in',
        description: 'Continue with your Orb One account.',
        emailLabel: 'Email',
        emailPlaceholder: 'user@example.com',
        passwordLabel: 'Password',
        passwordPlaceholder: 'Enter your password',
        submit: 'Log in',
        backToHome: 'Back to home',
      },
    },
  },
} as const

export type Locale = keyof typeof messages
