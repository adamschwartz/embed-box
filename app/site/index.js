import "babel-polyfill"
import "./site.external-styl"

import {getStore} from "lib/store"
import {runDemo} from "lib/user-simulator"

const LIBRARY_SCRIPTS = [
  "./embed-box.js",
  "./embed-box-custom.js",
  "./embed-box-custom-target.js"
]

function bindObjectArguments(Constructor, boundSpec = {}) {
  return spec => {
    return new Constructor({...boundSpec, ...spec})
  }
}

function loadDemoScripts(document, onLoad = () => {}) {
  let {length} = LIBRARY_SCRIPTS

  function onScriptLoad() {
    length--
    if (length === 0) onLoad()
  }

  LIBRARY_SCRIPTS.forEach(path => {
    const script = document.createElement("script")

    script.onload = onScriptLoad
    script.src = path
    document.head.appendChild(script)
  })
}

document.addEventListener("DOMContentLoaded", () => {
  const tocContainer = document.querySelector(".table-of-contents")

  Array
    .from(document.querySelectorAll("h2.headline-with-anchor [name], h3.headline-with-anchor [name]"))
    .forEach(({parentNode, href, textContent}) => {
      let ul = tocContainer

      if (parentNode.tagName === "H3") {
        ul = tocContainer.lastChild.lastChild
      }

      const li = document.createElement("li")
      const a = document.createElement("a")

      a.href = href
      a.textContent = textContent
      ul.appendChild(li)
      li.appendChild(a)

      if (parentNode.tagName === "H2") {
        const nextUl = document.createElement("ul")
        li.appendChild(nextUl)
      }
    })

  const PRISTINE_GLOBALS = {
    EmbedBox: window.EmbedBox,
    EmbedBoxCustom: window.EmbedBoxCustom
  }
  const automatedFrame = document.getElementById("automated-frame")
  const runInlineContainer = document.getElementById("run-inline-container")
  const docs = document.querySelector(".slide.docs")
  const docsContent = docs.querySelector(".docs-content")
  let createInteractiveDemo

  function loopRunDemo() {
    createInteractiveDemo = runDemo(automatedFrame, loopRunDemo)
  }

  loadDemoScripts(automatedFrame.contentDocument, loopRunDemo)

  function handleRunClick({target}) {
    const {instance: previousInstance} = getStore() || {}
    const {parentElement} = target
    const useModal = target.getAttribute("data-run") === "modal"
    const container = useModal ? document.body : runInlineContainer
    const {innerText: example} = parentElement.querySelector("code")

    if (!useModal) {
      docsContent.insertBefore(runInlineContainer, parentElement.nextSibling)
    }

    if (previousInstance) previousInstance.destroy()

    if (createInteractiveDemo) {
      // The hero automated demo takes focus from other inputs.
      // Switching to the interactive demo prevents this.
      createInteractiveDemo()
      createInteractiveDemo = null
    }

    // Clear previous demo routing.
    window.history.pushState("", "", window.location.pathname)

    Object.keys(PRISTINE_GLOBALS).forEach(key => {
      window[key] = bindObjectArguments(PRISTINE_GLOBALS[key], {container})
    })
    window.eval(example) // eslint-disable-line no-eval
  }

  Array
    .from(document.querySelectorAll("button[data-run]"))
    .forEach(element => element.addEventListener("click", handleRunClick))
})