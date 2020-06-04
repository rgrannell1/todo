#!/usr/bin/env node

const marked = require('marked')
const fs = require('fs').promises
const errors = require('@rgrannell/errors')

const constants = require('../commons/constants')

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

/**
 *
 * @param {string} text a todo list item
 *
 * @returns {Object} list-item data
 */
const parseListItem = text => {
  if (!text.startsWith('- [')) {
    throw errors.badFormatting(`list item should start with "- [", but didn't; the actual entry was "${text}"`, constants.codes.BAD_FORMATTING)
  }

  const isSupported = constants.prefixes.some(prefix => {
    return text.startsWith(`- [${prefix}]`)
  })

  if (!isSupported) {
    const supported = constants.prefixes.map(data => `"${data}"`).join(', ')
    throw errors.badFormatting(`checkmarks can only be ${supported}: actual start was "${text.slice(0, 6)}" `)
  }

  let tagText
  let bracketIdx
  if (text.endsWith(')')) {
    bracketIdx = text.slice(0).lastIndexOf('(')
    tagText = text.slice(bracketIdx + 1, -1)
  }

  const tags = (tagText || '')
    .split(/\,\s*/g)
    .map(data => {
      return data.trim()
    })
    .filter(item => item.length > 0)

  const infix = bracketIdx
    ? text.slice(6, bracketIdx)
    : text.slice(6)

  const itemData = {
    message: infix.trim(),
    tags
  }

  return itemData
}

const parseTaskList = token => {
  const items = token.items.map(data => {
    return parseListItem(data.raw)
  })

  return {
    type: 'list',
    items
  }
}

/**
 * Find task data
 *
 * @param {Object[]} tokens
 */
const parseTaskData = tokens => {
  const data = []

  let underHeading = false
  for (let token of tokens) {
    if (isToken.h2(token) && token?.text?.toLowerCase() === 'tasks') {
      underHeading = true
      continue
    }

    if (underHeading && isToken.h2(token)) {
      validateTasks(data)
      return data
    } else if (underHeading) {
      if (token.type === 'list') {
        data.push(parseTaskList(token))
      } else {
        data.push(token)
      }
    }
  }

  validateTasks(data)
  return data
}

const parseTodoList = async fpath => {
  let content
  try {
    const buffer = await fs.readFile(fpath)
    content = buffer.toString()
  } catch (err) {
    throw err
  }

  let tokens
  try {
    tokens = marked.lexer(content)
  } catch (err) {
    throw new Error('failed to parse.')
  }

  const listData = {
    lists: {}
  }

  const heading = tokens[0]

  if (!isToken.h1(heading)) {
    throw errors.badFormatting('todo list was missing title.', constants.codes.BAD_FORMATTING)
  } else {
    listData.title = heading.text
  }

  if (isToken.paragraph(tokens[1])) {
    listData.description = tokens[1].text
  }

  const subheadingTitles = tokens
    .filter(isToken.h2)
    .map(data => {
      return data.text.toLowerCase()
    })

  for (const heading of constants.subheadings) {
    if (!subheadingTitles.includes(heading)) {
      throw errors.badFormatting(`todo list was missing subheading "${heading}".`, constants.codes.BAD_FORMATTING)
    }
  }

  const tasks = parseTaskData(tokens)

  let target = ''
  for (const item of tasks) {
    if (isToken.h3(item)) {
      target = item.text
      listData.lists[target] = []
    } else if (isToken.list(item)) {
      listData.lists[target] = item.items
    } else {
      throw errors.badFormatting('invalid.')
    }

  }

  return listData
}

const validateTodoList = async fpath => {

  console.log(JSON.stringify(todo, null, 2))
}

const validateTasks = tokens => {
  if (tokens.length === 1) {
    const [token] = tokens

    if (!isToken.list(token)) {
      throw new errors.badFormatting('#tasks should contain a list, or headers and lists alternatively.', constants.codes.BAD_FORMATTING)
    }
  }

  let expected = 'heading'
  let idx = 1

  for (const token of tokens) {
    if (token.type !== expected) {
      throw new errors.badFormatting(`expected #tasks entry number ${idx} to be a ${expected}, but it was a ${token.type}`, constants.codes.BAD_FORMATTING)
    }

    expected = expected === 'heading'
      ? 'list'
      : 'heading'

    ++idx
  }
}

const getTags = todo => {
  const tags = new Set([])

  for (const list of Object.values(todo.lists)) {
    for (const task of list) {
      for (const tag of task.tags) {
        tags.add(tag)
      }
    }
  }

  return [...tags]
}

preprocess = args => {
  return {
    fpath: args['<list>'],
    list: args.list,
    tags: args.tags
  }
}

validate = args => {

}

const todo = async rawArgs => {
  const args = await preprocess(rawArgs)
  await validate(args)
  const todo = await parseTodoList(args.fpath)

  if (args.list && args.tags) {
    const tags = getTags(todo)

    for (const tag of tags) {
      console.log(tag)
    }
  } else {
    console.log(JSON.stringify(todo))
  }
}


module.exports = todo
