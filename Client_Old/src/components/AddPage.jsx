import { Button, Dropdown, Popconfirm, Flex } from "antd";
import { useEditorStore } from "../store/useEditorStore";

import { FaRegCopy } from "react-icons/fa6";
import { BsArrowUp, BsArrowDown } from "react-icons/bs";
import { MdOutlineDelete, MdExposurePlus1 } from "react-icons/md";


export default function AddPage({ setPagesWithHistory }) {
    const { activeIndex, editorPages, setActiveIndex, setSelectedUniqueId, setPopUp } = useEditorStore();

    const handleSwitchPage = (idx) => {
        setActiveIndex(idx);
        setSelectedUniqueId(null);
        setPopUp(false);
    };

    const addPage = () =>
        setPagesWithHistory((prev) => {
            const next = [
                ...prev,
                { id: Date.now(), children: [], background: "#ffffff" },
            ];
            setTimeout(() => setActiveIndex(next?.length - 1), 0);
            return next;
        });

    const duplicatePage = (idx) =>
        setPagesWithHistory((prev) => {
            const cp = JSON.parse(JSON?.stringify(prev));
            const page = cp[idx];
            const copy = {
                ...JSON.parse(JSON.stringify(page)),
                id: Date.now(),
            };
            cp?.splice(idx + 1, 0, copy);
            setTimeout(() => setActiveIndex(idx + 1), 0);
            return cp;
        });

    const deletePage = (idx) => {
        setPagesWithHistory((prev) => {
            const cp = [...prev];
            
            if (cp.length <= 1) {
                return [{ id: 1, children: [], background: "#ffffff" }];
            }
            
            cp.splice(idx, 1);
            
            let newIndex;
            if (idx === activeIndex) {
                newIndex = idx > 0 ? idx - 1 : 0;
            } else if (idx < activeIndex) {
                newIndex = activeIndex - 1;
            } else {
                newIndex = activeIndex;
            }
            
            newIndex = Math.max(0, Math.min(cp.length - 1, newIndex));
            setTimeout(() => setActiveIndex(newIndex), 0);
            return cp;
        });
    };

    const moveUp = (idx) =>
        setPagesWithHistory((prev) => {
            if (idx <= 0) return prev;
            const cp = [...prev];
            [cp[idx - 1], cp[idx]] = [cp[idx], cp[idx - 1]];
            setTimeout(() => setActiveIndex(idx - 1), 0);
            return cp;
        });

    const moveDown = (idx) =>
        setPagesWithHistory((prev) => {
            if (idx >= prev?.length - 1) return prev;
            const cp = [...prev];
            [cp[idx + 1], cp[idx]] = [cp[idx], cp[idx + 1]];
            setTimeout(() => setActiveIndex(idx + 1), 0);
            return cp;
        });

    return (
        <Flex align="center" justify="center" gap={10}>
            {editorPages && editorPages?.map((p, idx) => {
                const isActive = idx === activeIndex;

                const menuItems = [
                    {
                        key: "duplicate",
                        label: "Duplicate",
                        icon: <FaRegCopy size={20} />,
                        onClick: () => duplicatePage(idx),
                    },
                    {
                        key: "moveUp",
                        label: "Move Up",
                        icon: <BsArrowUp size={22} />,
                        disabled: idx === 0,
                        onClick: () => moveUp(idx),
                    },
                    {
                        key: "moveDown",
                        label: "Move Down",
                        icon: <BsArrowDown size={22} />,
                        disabled: idx === editorPages?.length - 1,
                        onClick: () => moveDown(idx),
                    },
                    {
                        key: "delete",
                        label: editorPages?.length <= 1 ? (
                            <span style={{ color: "#999999" }}>
                                Cannot delete last page
                            </span>
                        ) : (
                            <Popconfirm
                                title="Delete this page?"
                                okText="Yes"
                                cancelText="No"
                                onConfirm={() => deletePage(idx)}
                            >
                                <span style={{ color: "red" }}>
                                    Delete
                                </span>
                            </Popconfirm>
                        ),
                        icon: <MdOutlineDelete size={25} color={editorPages?.length <= 1 ? "#999999" : "red"} />,
                        disabled: editorPages?.length <= 1,
                    },
                ];

                return (
                    <div key={p?.id ?? idx}>
                        <Dropdown

                            menu={{ items: menuItems }}
                            placement="top"
                            trigger={["hover"]}
                        >
                            <Button onClick={() => handleSwitchPage(idx)} style={{
                                width: 70,
                                height: 70,
                                border: isActive ? "2px solid #FF6B35" : "1px solid #e0e0e0",
                                background: isActive ? "#FFF4F0" : "white",
                                color: isActive ? "#FF6B35" : "#1a1a1a",
                                fontWeight: isActive ? 600 : 500,
                                borderRadius: 8,
                                boxShadow: isActive ? "0 2px 8px rgba(255, 107, 53, 0.15)" : "none"
                            }} >Page {idx + 1}</Button>
                        </Dropdown>
                    </div>
                );
            })}

            <Button icon={<MdExposurePlus1 size={25} />} onClick={addPage} style={{
                width: 70,
                height: 70,
                border: "1px solid #e0e0e0",
                borderRadius: 8,
                color: "#1a1a1a"
            }} />
        </Flex>
    );
};