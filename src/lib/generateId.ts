const defaultChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export default function generateId(length = 17, chars = defaultChars) {
  let text = ''

  for (let i = 0; i < length; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return text
}
