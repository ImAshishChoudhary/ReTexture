import React, { useRef, useState, useEffect } from "react";
import { Text, Transformer, Rect } from "react-konva";
import { useKonvaSnapping } from "use-konva-snapping";
import { Html } from "react-konva-utils";

export default function SelectableText({ shape, selected, onSelect, onChange, stageRef}) {
    const ref = useRef();
    const trRef = useRef();
    const cursorRef = useRef();
    const [isEditing, setIsEditing] = useState(false);
    const [draftText, setDraftText] = useState(shape?.text || "");
    const [cursorPosition, setCursorPosition] = useState(0);
    const [showCursor, setShowCursor] = useState(true);
    const editingIdRef = useRef(null);

        const { handleDragging, handleDragEnd } = useKonvaSnapping({
        snapRange: 5,
        guidelineColor: "blue",
        guidelineWidth: 1,
        guidelineDash: [4, 4],
        snapToStageCenter: true,
        snapToStageBorders: true,
        snapToShapes: true,
    });

    useEffect(() => {
        if (isEditing) {
            setCursorPosition(draftText.length);
            editingIdRef.current = shape?.id;
        } else {
            editingIdRef.current = null;
        }
    }, [isEditing, shape?.id]);

    useEffect(() => {
        if (!selected && isEditing) {
            setIsEditing(false);
            setCursorPosition(0);
            if (shape?.text !== draftText) {
                onChange({ ...shape, text: draftText });
            }
        }
    }, [selected, isEditing, shape, draftText, onChange]);

    const commitEdit = () => {
        if (!isEditing) return;
        setIsEditing(false);
        setCursorPosition(0);
        if (shape?.text !== draftText) {
            onChange({ ...shape, text: draftText });
        }
    };

    useEffect(() => {
        if (selected && !isEditing && trRef.current && ref.current) {
            trRef.current.nodes([ref.current]);
            trRef.current.getLayer().batchDraw();
        }
    }, [selected, isEditing]);

    if (!shape) return null;


    useEffect(() => {
        if (ref.current) {
            ref.current.fill(shape.fill);
            ref.current.getLayer()?.batchDraw();
        }
    }, [shape?.fill]);


    useEffect(() => {
        if (ref.current && shape?.textTransform) {
            setDraftText((text) => {
                if (shape?.textTransform === "lowercase") return String(text)?.toLowerCase();
                if (shape?.textTransform === "uppercase") return String(text)?.toUpperCase();
                 if (shape?.textTransform === "none") return text;
                return text;
            });
        }
    }, [shape?.textTransform]);

    function isLocked(){
      if (shape?.locked) return; 
    }

    return (
        <>
            {isEditing ? (
                <Html groupProps={{ x: shape.x, y: shape.y }} divProps={{ style: { opacity: 1 } }}>
                    <textarea
                        value={draftText}
                        onChange={(e) => {
                            setDraftText(e.target.value);
                            // Auto-resize height
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        autoFocus
                        onBlur={() => {
                            commitEdit();
                            setIsEditing(false);
                        }}
                        onKeyDown={(e) => {
                             // Shift+Enter for new line, Enter to commit
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                commitEdit();
                                setIsEditing(false);
                            }
                        }}
                        style={{
                            width: shape.width + 'px',
                            minHeight: shape.fontSize + 'px',
                            fontSize: shape.fontSize + 'px',
                            fontFamily: shape.fontFamily,
                            fontWeight: shape.bold ? 'bold' : 'normal',
                            fontStyle: shape.italic ? 'italic' : 'normal',
                            color: shape.fill,
                            textAlign: shape.align || 'left',
                            lineHeight: 1.2,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            resize: 'none',
                            overflow: 'hidden',
                            padding: 0,
                            margin: 0,
                            boxSizing: 'border-box',
                            textTransform: shape.textTransform || 'none',
                            letterSpacing: (shape.letterSpacing || 0) + 'px'
                        }}
                    />
                </Html>
            ) : null}

            {!isEditing && (
                <Text
                    ref={ref}
                    {...shape}
                    
                    textDecoration={[
                        shape?.underline ? "underline" : "",
                        shape?.lineThrough ? "line-through" : "",
                    ].join(" ")}

                    fontStyle={`${shape?.bold ? "bold " : ""}${shape?.italic ? "italic" : ""}`}
                    text={draftText}
                    draggable={!isEditing && !shape?.locked}
                    visible={shape?.visible && !isEditing}
                    onMouseDown={(e) => {
                        if (shape?.locked) return;
                        if (isEditing) {
                            commitEdit();
                        }
                        onSelect(e);
                    }}
                    onTap={(e) => {
                        if (shape?.locked) return;
                        if (isEditing) {
                            commitEdit();
                        }
                        onSelect(e);
                    }}
                    onDblClick={() =>{
                        console.log('SelectableText: Double Click Detected!', shape?.id);
                        if (shape?.locked) {
                            console.log('SelectableText: Shape is locked');
                            return;
                        }
                        console.log('SelectableText: Entering edit mode');
                        setIsEditing(true);
                    }}
                    onDblTap={() =>{
                        if (shape?.locked) return;
                        setIsEditing(true);
                    }}
                    onDragMove={(e) => {
                        if (shape?.locked) return;
                        handleDragging(e);
                        e.target.position({ x: e.target.x(), y: e.target.y() });
                    }}
                    onDragEnd={(e) => {
                        if (shape?.locked) return;
                        commitEdit();
                        handleDragEnd(e)
                        onChange({ ...shape, x: e.target.x(), y: e.target.y() });
                    }}
                    onTransformEnd={() => {
                        if (shape?.locked) return;
                        const node = ref.current;
                        const scaleX = node.scaleX();
                        const scaleY = node.scaleY();
                        const rotation = node.rotation();

                        node.scaleX(1);
                        node.scaleY(1);

                        const width = Math.max(20, node.width() * scaleX);
                        const fontSize = Math.max(6, (shape?.fontSize || 16) * scaleY);

                        commitEdit();
                        onChange({
                            ...shape,
                            x: node.x(),
                            y: node.y(),
                            width: width,
                            fontSize: Math.round(fontSize),
                            rotation: Math.round(rotation),
                        });
                    }}

                    onMouseEnter={(e) => {
                        if (shape?.locked) return;
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = "move";
                    }}
                    onMouseLeave={(e) => {
                        if (shape?.locked) return;
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = "default";
                    }}
                />
            )}

            {/* Remove custom cursor rendering as we use native textarea */}

            {selected && !isEditing && (
                <Transformer
                    ref={trRef}
                    // rotateEnabled
                    enabledAnchors={[
                        "middle-left",
                        "middle-right",
                        
                        "top-center",
                        "bottom-center",

                        "top-left",
                        "top-right",
                        
                        "bottom-left",
                        "bottom-right",
                    ]}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (newBox.width < 20 || newBox.height < 10) return oldBox;
                        newBox.width = newBox.width;
                        newBox.height = newBox.height;
                        return newBox;
                    }}
                    onTransformStart={(e) => {
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = "nwse-resize";
                    }}
                    onTransformEnd={(e) => {
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = "default";
                    }}
                />
            )}
        </>
    );
}