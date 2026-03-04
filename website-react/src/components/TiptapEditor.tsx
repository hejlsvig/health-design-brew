import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Minus, Link as LinkIcon, Image as ImageIcon,
  Undo, Redo, Code, Pilcrow,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TiptapEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

function MenuButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        disabled && 'opacity-30 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}

export default function TiptapEditor({ content, onChange, placeholder: _placeholder }: TiptapEditorProps) {
  // Track the last value we sent via onChange to prevent echo loops
  const lastEmittedHTML = useRef<string>('')
  const isSettingContent = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-accent underline' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'rounded-lg max-w-full' },
      }),
      TextStyle,
      Color,
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'tiptap-content prose prose-green max-w-none min-h-[300px] px-4 py-3 focus:outline-none',
      },
    },
    onUpdate: ({ editor: ed }) => {
      // Skip if we're programmatically setting content (external sync)
      if (isSettingContent.current) return
      const html = ed.getHTML()
      lastEmittedHTML.current = html
      onChange(html)
    },
  })

  // Sync external content changes (e.g. from AI generation or language tab switch) into the editor
  useEffect(() => {
    if (!editor) return
    // Skip if the content matches what we last emitted (echo from our own onChange)
    if (content === lastEmittedHTML.current) return
    // Skip if content matches what's already in the editor (HTML normalization)
    const currentHTML = editor.getHTML()
    if (content === currentHTML) return
    if (content === undefined) return

    // Programmatically set content without triggering onUpdate
    isSettingContent.current = true
    editor.commands.setContent(content || '', false)
    lastEmittedHTML.current = content || ''
    isSettingContent.current = false
  }, [content, editor])

  if (!editor) return null

  const addLink = () => {
    const url = window.prompt('URL:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const addImage = () => {
    const url = window.prompt('Image URL:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const iconSize = 'h-4 w-4'

  return (
    <div className="rounded-md border border-input bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5">
        {/* Text formatting */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Fed"
        >
          <Bold className={iconSize} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Kursiv"
        >
          <Italic className={iconSize} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Understreget"
        >
          <UnderlineIcon className={iconSize} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Gennemstreget"
        >
          <Strikethrough className={iconSize} />
        </MenuButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Headings */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Overskrift 1"
        >
          <Heading1 className={iconSize} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Overskrift 2"
        >
          <Heading2 className={iconSize} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Overskrift 3"
        >
          <Heading3 className={iconSize} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          active={editor.isActive('paragraph')}
          title="Paragraf"
        >
          <Pilcrow className={iconSize} />
        </MenuButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Lists */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Punktliste"
        >
          <List className={iconSize} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Nummereret liste"
        >
          <ListOrdered className={iconSize} />
        </MenuButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Block elements */}
        <MenuButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Citat"
        >
          <Quote className={iconSize} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Kodeblok"
        >
          <Code className={iconSize} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Vandret linje"
        >
          <Minus className={iconSize} />
        </MenuButton>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Insert */}
        <MenuButton
          onClick={addLink}
          active={editor.isActive('link')}
          title="Indsæt link"
        >
          <LinkIcon className={iconSize} />
        </MenuButton>
        <MenuButton
          onClick={addImage}
          title="Indsæt billede"
        >
          <ImageIcon className={iconSize} />
        </MenuButton>

        <div className="flex-1" />

        {/* Undo/Redo */}
        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Fortryd"
        >
          <Undo className={iconSize} />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Gentag"
        >
          <Redo className={iconSize} />
        </MenuButton>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  )
}
