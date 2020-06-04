#!/usr/bin/env node

const { docopt } = require('docopt')
const marked = require('marked')
const fs = require('fs').promises
const errors = require('@rgrannell/errors')

const constants = {
  subheadings: ['tasks']
}

const args = docopt(`
Usage:
  todo [--] <list>
Description:
  manage and analyse a markdown-based todo list.
`)

const isToken = {}

isToken.h1 = data => {
  return data.type === 'heading' && data.depth === 1
}

isToken.h2 = data => {
  return data.type === 'heading' && data.depth === 2
}

/**
 * Find task data.
 *
 * @param {Object[]} tokens
 */
const findTaskData = tokens => {
  const data = []

  let underHeading = false
  for (let token of tokens) {
    if (isToken.h2(token) && token?.text?.toLowerCase() === 'tasks') {
      underHeading = true
      continue
    }

    if (underHeading && isToken.h2(token)) {
      return data
    } else if (underHeading) {
      data.push(token)
    }
  }
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

  const listData = { }

  const heading = tokens[0]

  if (!isToken.h1(heading)) {
    throw errors.badFormatting('todo list was missing title.')
  } else {
    listData.title = tokens[0].text
  }

  const subheadingTitles = tokens
    .filter(isToken.h2)
    .map(data => {
      return data.text.toLowerCase()
    })

  for (const heading of constants.subheadings) {
    if (!subheadingTitles.includes(heading)) {
      throw errors.badFormatting(`todo list was missing subheading "${heading}".`)
    }
  }

  const tasks = findTaskData(tokens)

  return listData
}

const todo = async rawArgs => {
  const args = await todo.preprocess(rawArgs)
  await todo.validate(args)

  await validateTodoList(args.fpath)
}

todo.preprocess = args => {
  return {
    fpath: args['<list>']
  }
}

todo.validate = args => {

}

const validateTodoList = async fpath => {
  const todo = await parseTodoList(fpath)

  console.log(todo)
}

todo(args).catch(err => {
  throw err
})
