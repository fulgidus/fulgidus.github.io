function isNonNavigableProtocol(link: string) {
  return /^(mailto|tel|sms|geo|data):/i.test(link)
}

function hasProtocol(link: string) {
  if (isNonNavigableProtocol(link)) {
    return false
  }
  const match = /^[a-z0-9-]+:\/\//i.exec(link)
  if (match?.length !== undefined && match.length > 0) {
    return true
  }
  return false
}

export function getLinkTarget(link: string) {
  return hasProtocol(link) ? '_blank' : '_self'
}

export function isExternalLink(link: string) {
  return hasProtocol(link)
}
