#!/usr/bin/env node

const { docopt } = require('docopt')
const marked = require('marked')
const fs = require('fs').promises
const errors = require('@rgrannell/errors')

const constants = require('../commons/constants')
const todo = require('../app/todo')

const args = docopt(`
Usage:
  todo [--] <list>
  todo list tags [--] <list>
Description:
  manage and analyse a markdown-based todo list.
`)

todo(args).catch(err => {
  throw err
})
