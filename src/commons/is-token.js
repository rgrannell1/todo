
const isToken = {}

isToken.h1 = data => {
  return data.type === 'heading' && data.depth === 1
}

isToken.h2 = data => {
  return data.type === 'heading' && data.depth === 2
}

isToken.h3 = data => {
  return data.type === 'heading' && data.depth === 3
}

isToken.list = data => {
  return data.type === 'list'
}

isToken.paragraph = data => {
  return data.type === 'paragraph'
}

module.exports = isToken
